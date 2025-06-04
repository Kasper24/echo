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
        const method = path[path.length - 1] as HttpMethod;
        const urlWithoutMethod = this.path.slice(0, -1).join("/");
        const url = `${this.baseUrl}/${urlWithoutMethod}`;
        return this.executeRequest(url, method, input);
      },
    }) as any;
  }

  private async executeRequest(path: string, method: HttpMethod, input: any) {
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

    let cookieHeader = null;
    if (input?.cookies)
      cookieHeader = Object.entries(input.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");

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

    let config: RequestInit = {
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
    };

    const makeRequest = async (): Promise<any> => {
      try {
        for (const requestInterceptor of this.interceptors?.onRequest || []) {
          const result = await requestInterceptor({
            path: new URL(path).pathname,
            config,
          });
          if (isRouteHandlerResponse(result)) {
            return result;
          } else if (result !== undefined) {
            config = result;
          }
        }

        let response = await fetch(url.toString(), config);

        for (const interceptor of this.interceptors?.onResponse || []) {
          const result = await interceptor({
            path: new URL(path).pathname,
            config,
            response,
            retry: makeRequest,
          });
          if (isRouteHandlerResponse(result)) {
            return result;
          }
        }

        const data = deserialize(await response.json());
        const status = response.status as HttpStatusCode;
        return {
          status: getStatus(status)!.key,
          data: data as any,
          response: response,
        };
      } catch (error) {
        for (const errorInterceptor of this.interceptors?.onError || []) {
          const result = await errorInterceptor({
            path: new URL(path).pathname,
            config,
            error,
            retry: makeRequest,
          });
          if (isRouteHandlerResponse(result)) {
            return result;
          }
        }
      }
    };

    return makeRequest();
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
