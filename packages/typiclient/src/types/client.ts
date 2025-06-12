import {
  RouteHandlerResponse,
  TypiRoute,
  type TypiRouter,
} from "@repo/typiserver";
import { type TypiClient } from "../client";
import { MaybePromise, StripLeadingSlash } from "./util";
import { InferRouteInput, InferRouteOutput } from "./infer";

// export type TypiClientInstance<TRouter extends TypiRouter<any>> = TypiClient & {
//   [Path in keyof TRouter["routes"] as StripLeadingSlash<
//     Path & string
//   >]: TRouter["routes"][Path] extends TypiRouter<any>
//     ? TypiClientInstance<TRouter["routes"][Path]>
//     : TRouter["routes"][Path] extends TypiRoute
//       ? {
//           [Method in keyof TRouter["routes"][Path]]: {} extends InferRouteInput<
//             TRouter,
//             Path,
//             Method
//           >
//             ? // No input required - function can be called with no args or with optional args
//               ((args?: {
//                 input?: InferRouteInput<TRouter, Path, Method>;
//                 options?: ClientOptions;
//               }) => Promise<
//                 InferRouteOutput<TRouter, Path, Method> & {
//                   response: Response;
//                 }
//               >) &
//                 (() => Promise<
//                   InferRouteOutput<TRouter, Path, Method> & {
//                     response: Response;
//                   }
//                 >)
//             : // Input is required - args parameter is mandatory
//               (args: {
//                 input: InferRouteInput<TRouter, Path, Method>;
//                 options?: ClientOptions;
//               }) => Promise<
//                 InferRouteOutput<TRouter, Path, Method> & {
//                   response: Response;
//                 }
//               >;
//         }
//       : never;
// };

export type TypiClientInstance<
  TRouter extends TypiRouter<any>,
  TGlobalOptions extends ClientOptions,
> = TypiClient & {
  [Path in keyof TRouter["routes"] as StripLeadingSlash<
    Path & string
  >]: TRouter["routes"][Path] extends TypiRouter<any>
    ? TypiClientInstance<TRouter["routes"][Path], TGlobalOptions>
    : TRouter["routes"][Path] extends TypiRoute
      ? {
          [Method in keyof TRouter["routes"][Path]]: {} extends InferRouteInput<
            TRouter,
            Path,
            Method
          >
            ? // No input required - overloaded signatures
              {
                // When request throwOnErrorStatus is explicitly true
                (args: {
                  input?: InferRouteInput<TRouter, Path, Method>;
                  options: ClientOptions & { throwOnErrorStatus: true };
                }): Promise<
                  InferRouteOutput<
                    TRouter,
                    Path,
                    Method,
                    TGlobalOptions,
                    { throwOnErrorStatus: true }
                  > & {
                    response: Response;
                  }
                >;
                // When request throwOnErrorStatus is explicitly false
                (args: {
                  input?: InferRouteInput<TRouter, Path, Method>;
                  options: ClientOptions & { throwOnErrorStatus: false };
                }): Promise<
                  InferRouteOutput<
                    TRouter,
                    Path,
                    Method,
                    TGlobalOptions,
                    { throwOnErrorStatus: false }
                  > & {
                    response: Response;
                  }
                >;
                // When no request options provided (uses global options)
                (args?: {
                  input?: InferRouteInput<TRouter, Path, Method>;
                  options?: Omit<ClientOptions, "throwOnErrorStatus">;
                }): Promise<
                  InferRouteOutput<
                    TRouter,
                    Path,
                    Method,
                    TGlobalOptions,
                    {}
                  > & {
                    response: Response;
                  }
                >;
                // Default overload (no args, uses global options)
                (): Promise<
                  InferRouteOutput<
                    TRouter,
                    Path,
                    Method,
                    TGlobalOptions,
                    {}
                  > & {
                    response: Response;
                  }
                >;
              }
            : // Input is required - overloaded signatures
              {
                // When request throwOnErrorStatus is explicitly true
                (args: {
                  input: InferRouteInput<TRouter, Path, Method>;
                  options: ClientOptions & { throwOnErrorStatus: true };
                }): Promise<
                  InferRouteOutput<
                    TRouter,
                    Path,
                    Method,
                    TGlobalOptions,
                    { throwOnErrorStatus: true }
                  > & {
                    response: Response;
                  }
                >;
                // When request throwOnErrorStatus is explicitly false
                (args: {
                  input: InferRouteInput<TRouter, Path, Method>;
                  options: ClientOptions & { throwOnErrorStatus: false };
                }): Promise<
                  InferRouteOutput<
                    TRouter,
                    Path,
                    Method,
                    TGlobalOptions,
                    { throwOnErrorStatus: false }
                  > & {
                    response: Response;
                  }
                >;
                // When no throwOnErrorStatus in request options (uses global)
                (args: {
                  input: InferRouteInput<TRouter, Path, Method>;
                  options?: Omit<ClientOptions, "throwOnErrorStatus">;
                }): Promise<
                  InferRouteOutput<
                    TRouter,
                    Path,
                    Method,
                    TGlobalOptions,
                    {}
                  > & {
                    response: Response;
                  }
                >;
              };
        }
      : never;
};

export type BaseHeaders = Record<
  string,
  string | (() => string | Promise<string>)
>;

export interface RequestInterceptors {
  onRequest?: (({
    path,
    config,
  }: {
    path: string;
    config: RequestInit & {
      [key: string]: any;
    };
  }) => MaybePromise<RequestInit | RouteHandlerResponse | void>)[];
  onResponse?: (({
    path,
    config,
    response,
    retry,
  }: {
    path: string;
    config: RequestInit & {
      [key: string]: any;
    };
    response: Response;
    retry: () => Promise<RouteHandlerResponse>;
  }) => MaybePromise<RouteHandlerResponse | void>)[];
  onError?: (({
    path,
    config,
    error,
    retry,
  }: {
    path: string;
    config: RequestInit & {
      [key: string]: any;
    };
    error: any;
    retry: () => Promise<RouteHandlerResponse>;
  }) => MaybePromise<RouteHandlerResponse | void>)[];
}

export interface ClientOptions {
  credentials?: RequestCredentials;
  timeout?: number;
  throwOnErrorStatus?: boolean;
}
