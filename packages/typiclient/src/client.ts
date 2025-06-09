import { deserialize } from "superjson";
import type { RouteHandlerResponse, TypiRouter } from "@repo/typiserver";
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
      apply: (_, __, [input]) => {
        const method = path[path.length - 1].toUpperCase() as HttpMethod;
        const urlWithoutMethod = this.path.slice(0, -1).join("/");
        const url = `${this.baseUrl}/${urlWithoutMethod}`;
        return this.executeRequest(url, method, input);
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

  private async buildHeaders(input: any) {
    const cookieHeader = this.buildCookieHeader(input?.cookies);

    let headers = {
      "Content-Type": "application/json",
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

  private async buildRequestConfig(method: HttpMethod, input: any) {
    const headers = await this.buildHeaders(input);

    return {
      credentials: this.options?.credentials,
      method: method,
      headers: headers,
      body:
        method !== "get" && method !== "head" && input?.body
          ? JSON.stringify(input.body)
          : undefined,
      signal: this.options?.timeout
        ? AbortSignal.timeout(this.options.timeout)
        : undefined,
    } as RequestInit;
  }

  private async executeInterceptors(
    url: URL,
    config: RequestInit,
    response?: Response,
    error?: any
  ) {
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
          retry: () => this.makeRequest(url, config),
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
          retry: () => this.makeRequest(url, config),
        });
        if (isRouteHandlerResponse(result)) {
          return { result };
        }
      }
    }

    return {};
  }

  private async makeRequest(url: URL, config: RequestInit): Promise<any> {
    try {
      const response = await fetch(url.toString(), config);

      const interceptorResult = await this.executeInterceptors(
        url,
        config,
        response
      );
      if (interceptorResult.result) {
        return interceptorResult.result;
      }

      const data = deserialize(await response.json());
      const status = getStatus(response.status as HttpStatusCode).key;

      console[status === "OK" ? "log" : "error"](
        `Request to ${url.toString()} returned status ${status}`,
        data
      );

      return {
        status: status,
        data: data as any,
        response: response,
      };
    } catch (error) {
      console.error(`Error making request to ${url.toString()}`, error);
      const interceptorResult = await this.executeInterceptors(
        url,
        config,
        undefined,
        error
      );
      if (interceptorResult.result) {
        return interceptorResult.result;
      }
      throw error;
    }
  }

  private async executeRequest(path: string, method: HttpMethod, input: any) {
    const url = this.buildUrl(path, input);
    let config = await this.buildRequestConfig(method, input);

    // Execute request interceptors
    const interceptorResult = await this.executeInterceptors(url, config);

    if (interceptorResult.result) {
      return interceptorResult.result;
    }

    if (interceptorResult.config) {
      config = interceptorResult.config;
    }

    return this.makeRequest(url, config);
  }
}

export function createTypiClient<T extends TypiRouter>({
  baseUrl,
  baseHeaders,
  interceptors,
  options,
}: {
  baseUrl: string;
  baseHeaders?: BaseHeaders;
  interceptors?: RequestInterceptors;
  options?: ClientOptions;
}): TypiClientInstance<T> {
  return new TypiClient(
    baseUrl,
    [],
    baseHeaders,
    interceptors,
    options
  ) as TypiClientInstance<T>;
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
