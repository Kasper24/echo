import { type TypiClient } from "./client";
import {
  MiddlewareHandlers,
  RouteHandlerResponse,
  type TypiRouter,
} from "@repo/typiserver";
import {
  ExtractRoutesOutputsByStatusCodes,
  RouteDefinition,
  RouteHandlerValidatedInput,
  TypiRoute,
} from "@repo/typiserver";
import { HttpErrorStatusKey } from "@repo/typiserver/http";

export type TypiClientInstance<TRouter extends TypiRouter<any>> = TypiClient & {
  [Path in keyof TRouter["routes"] as StripLeadingSlash<
    Path & string
  >]: TRouter["routes"][Path] extends TypiRouter<any>
    ? TypiClientInstance<TRouter["routes"][Path]>
    : TRouter["routes"][Path] extends TypiRoute
      ? {
          [Method in keyof TRouter["routes"][Path]]: (
            params?: InferRouteInput<TRouter, Path, Method>
          ) => Promise<
            InferRouteOutput<TRouter, Path, Method> & {
              response: Response;
            }
          >;
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
}

type InferRouteInput<
  TRouter extends TypiRouter<any>,
  TPath extends keyof TRouter["routes"],
  TMethod extends keyof TRouter["routes"][TPath],
> =
  TRouter["routes"][TPath][TMethod] extends RouteDefinition<
    any,
    infer TInput,
    any
  >
    ? TPath extends string
      ? RouteHandlerValidatedInput<TInput, TPath> extends infer TValidatedInput
        ? TValidatedInput extends { cookies: any }
          ? Omit<TValidatedInput, "cookies"> & {
              cookies?: {
                [K in keyof TValidatedInput["cookies"]]?: TValidatedInput["cookies"][K];
              };
            }
          : TValidatedInput
        : never
      : never
    : never;

// type InferRouteInput<
//   TRouter extends TypiRouter<any>,
//   TPath extends keyof TRouter["routes"],
//   TMethod extends keyof TRouter["routes"][TPath],
// > =
//   TRouter["routes"][TPath][TMethod] extends RouteDefinition<
//     any,
//     infer TInput,
//     any
//   >
//     ? TPath extends string
//       ? RouteHandlerValidatedInput<TInput, TPath>
//       : never
//     : never;

type InferRouteOutput<
  TRouter extends TypiRouter<any>,
  TPath extends keyof TRouter["routes"],
  TMethod extends keyof TRouter["routes"][TPath],
> =
  TRouter["routes"][TPath][TMethod] extends RouteDefinition<
    any,
    any,
    infer TMiddlewares,
    infer THandlerOutput
  >
    ?
        | ExtractRoutesOutputsByStatusCodes<TMiddlewares, HttpErrorStatusKey>
        | THandlerOutput // Has actual middlewares
    : never;

export type InferRouterInputs<TRouter extends TypiRouter<any>> = {
  [Path in keyof TRouter["routes"]]: TRouter["routes"][Path] extends TypiRouter<any>
    ? InferRouterInputs<TRouter["routes"][Path]>
    : TRouter["routes"][Path] extends TypiRoute
      ? {
          [Method in keyof TRouter["routes"][Path]]: InferRouteInput<
            TRouter,
            Path,
            Method
          >;
        }
      : never;
};

export type InferRouterOutputs<TRouter extends TypiRouter<any>> = {
  [Path in keyof TRouter["routes"]]: TRouter["routes"][Path] extends TypiRouter<any>
    ? InferRouterOutputs<TRouter["routes"][Path]>
    : TRouter["routes"][Path] extends TypiRoute
      ? {
          [Method in keyof TRouter["routes"][Path]]: Extract<
            InferRouteOutput<TRouter, Path, Method>,
            {
              status: "OK";
            }
          >["data"];
        }
      : never;
};

type StripLeadingSlash<S extends string> = S extends `/${infer R}` ? R : S;

type MaybePromise<T> = Promise<T> | T;
