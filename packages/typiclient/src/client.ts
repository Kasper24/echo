import { deserialize } from "superjson";
import type {
  RouteHandlerErrorDataResponse,
  RouteHandlerResponse,
  TypiRouter,
} from "@repo/typiserver";
import {
  type HttpMethod,
  type HttpStatusCode,
  getStatus,
} from "@repo/typiserver/http";
import {
  BaseHeaders,
  ClientOptions,
  RequestInterceptors,
  TypiClientInstance,
} from "./types";

export class TypiClient {
  private baseUrl: string;
  private path: string[];
  private baseHeaders?: BaseHeaders;
  private interceptors?: RequestInterceptors;
  private options?: ClientOptions;

  constructor(
    baseUrl: string,
    path: string[],
    headers?: BaseHeaders,
    interceptors?: RequestInterceptors,
    options?: ClientOptions
  ) {
    this.baseUrl = baseUrl;
    this.path = path;
    this.baseHeaders = headers;
    this.interceptors = interceptors;
    this.options = options || {};

    return new Proxy(() => {}, {
      get: (_, prop) => {
        if (typeof prop === "string") {
          return new TypiClient(
            this.baseUrl,
            [...this.path, prop],
            this.baseHeaders,
            this.interceptors,
            this.options
          );
        }
      },
      apply: (_, __, [args]) => {
        const method = path[path.length - 1].toUpperCase() as HttpMethod;
        const urlWithoutMethod = this.path.slice(0, -1).join("/");
        const url = `${this.baseUrl}/${urlWithoutMethod}`;
        return this.executeRequest(url, method, args?.input, args?.options);
      },
    }) as any;
  }

  private buildUrl(path: string, input: any) {
    const url = new URL(path);

    if (input?.path) {
      Object.entries(input.path).forEach(([key, value]) => {
        url.pathname = url.pathname.replace(`:${key}`, String(value));
      });
    }

    if (input?.query) {
      Object.entries(input.query).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    return url;
  }

  private buildCookieHeader(cookies: Record<string, string>) {
    if (!cookies) return null;

    return Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }

  private async buildHeaders(input: any, hasBody: boolean, hasFiles: boolean) {
    const cookieHeader = this.buildCookieHeader(input?.cookies);

    let headers = {
      ...(hasBody && !hasFiles ? { "Content-Type": "application/json" } : {}),
      ...(input?.headers || {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    };

    if (this.baseHeaders) {
      const headerEntries = await Promise.all(
        Object.entries(this.baseHeaders).map(
          async ([name, valueOrFunction]) => {
            if (typeof valueOrFunction === "function") {
              const result = valueOrFunction();
              const value = result instanceof Promise ? await result : result;
              return [name, value];
            } else {
              return [name, valueOrFunction];
            }
          }
        )
      );

      headers = { ...headers, ...Object.fromEntries(headerEntries) };
    }

    return headers;
  }

  private hasFileData(obj: any): boolean {
    if (obj instanceof File || obj instanceof Blob) {
      return true;
    }
    if (obj && typeof obj === "object") {
      return Object.values(obj).some((value) => this.hasFileData(value));
    }
    return false;
  }

  private buildFormData(data: any): FormData {
    const formData = new FormData();

    const appendToFormData = (obj: any, prefix = "") => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const formKey = prefix ? `${prefix}[${key}]` : key;

          if (value instanceof File || value instanceof Blob) {
            formData.append(formKey, value);
          } else if (
            value &&
            typeof value === "object" &&
            !(value instanceof Date)
          ) {
            appendToFormData(value, formKey);
          } else if (value !== null && value !== undefined) {
            formData.append(formKey, String(value));
          }
        }
      }
    };

    appendToFormData(data);
    return formData;
  }

  private async buildRequestConfig(
    method: HttpMethod,
    input: any,
    options?: ClientOptions
  ) {
    const hasBody = method !== "get" && method !== "head" && input?.body;
    const hasFiles = input?.body && this.hasFileData(input.body);
    const headers = await this.buildHeaders(input, hasBody, hasFiles);

    let body: string | FormData | undefined;

    if (hasBody) {
      if (hasFiles) body = this.buildFormData(input.body);
      else body = JSON.stringify(input.body);
    }

    return {
      credentials: options?.credentials || this.options?.credentials,
      method: method,
      headers: headers,
      body: body,
      signal: options?.timeout
        ? AbortSignal.timeout(options.timeout)
        : this.options?.timeout
          ? AbortSignal.timeout(this.options.timeout)
          : undefined,
    } as RequestInit;
  }

  private async executeInterceptors({
    url,
    config,
    response,
    error,
    options,
  }: {
    url: URL;
    config: RequestInit;
    response?: Response;
    error?: any;
    options?: ClientOptions;
  }) {
    // Handle request interceptors
    if (!response && !error) {
      for (const requestInterceptor of this.interceptors?.onRequest || []) {
        const result = await requestInterceptor({ path: url.pathname, config });
        if (isRouteHandlerResponse(result)) {
          return { result };
        } else if (result !== undefined) {
          config = result;
        }
      }
      return { config };
    }

    // Handle response interceptors
    if (response && !error) {
      for (const interceptor of this.interceptors?.onResponse || []) {
        const result = await interceptor({
          path: url.pathname,
          config,
          response,
          retry: () => this.makeRequest(url, config, options),
        });
        if (isRouteHandlerResponse(result)) {
          return { result };
        }
      }
    }

    // Handle error interceptors
    if (error) {
      for (const errorInterceptor of this.interceptors?.onError || []) {
        const result = await errorInterceptor({
          path: url.pathname,
          config,
          error,
          retry: () => this.makeRequest(url, config, options),
        });
        if (isRouteHandlerResponse(result)) {
          return { result };
        }
      }
    }

    return {};
  }

  private async makeRequest(
    url: URL,
    config: RequestInit,
    options?: ClientOptions
  ): Promise<any> {
    try {
      const response = await fetch(url.toString(), config);

      const interceptorResult = await this.executeInterceptors({
        url,
        config,
        response,
        options,
      });
      if (interceptorResult.result) {
        return interceptorResult.result;
      }

      const data = deserialize(await response.json());
      const status = getStatus(response.status as HttpStatusCode).key;

      console[status === "OK" ? "log" : "warn"]({
        URL: url.toString(),
        config: config,
        status: status,
        data: data,
      });

      if (
        status !== "OK" &&
        (options?.throwOnErrorStatus ?? this.options?.throwOnErrorStatus)
      ) {
        throw new Error((data as RouteHandlerErrorDataResponse).error.message);
      }

      return {
        status: status,
        data: data as any,
        response: response,
      };
    } catch (error) {
      console.error({
        URL: url.toString(),
        config: config,
        error: error instanceof Error ? error : undefined,
      });
      const interceptorResult = await this.executeInterceptors({
        url,
        config,
        error,
        options,
      });
      if (interceptorResult.result) {
        return interceptorResult.result;
      }
      throw error;
    }
  }

  private async executeRequest(
    path: string,
    method: HttpMethod,
    input: any,
    options?: ClientOptions
  ) {
    const url = this.buildUrl(path, input);
    let config = await this.buildRequestConfig(method, input, options);

    // Execute request interceptors
    const interceptorResult = await this.executeInterceptors({
      url,
      config,
      options,
    });

    if (interceptorResult.result) {
      return interceptorResult.result;
    }

    if (interceptorResult.config) {
      config = interceptorResult.config;
    }

    return this.makeRequest(url, config, options);
  }
}

export function createTypiClient<
  TRouter extends TypiRouter,
  TOptions extends ClientOptions,
>({
  baseUrl,
  baseHeaders,
  interceptors,
  options,
}: {
  baseUrl: string;
  baseHeaders?: BaseHeaders;
  interceptors?: RequestInterceptors;
  options?: TOptions;
}): TypiClientInstance<TRouter, TOptions> {
  return new TypiClient(
    baseUrl,
    [],
    baseHeaders,
    interceptors,
    options
  ) as TypiClientInstance<TRouter, TOptions>;
}

const isRouteHandlerResponse = (
  result: any
): result is RouteHandlerResponse => {
  return (
    result &&
    typeof result === "object" &&
    "status" in result &&
    "data" in result
  );
};
