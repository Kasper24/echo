import {
  ExtractRoutesOutputsByStatusCodes,
  RouteDefinition,
  RouteHandlerValidatedInput,
  TypiRoute,
  type TypiRouter,
} from "@repo/typiserver";
import { HttpErrorStatusKey } from "@repo/typiserver/http";

type ResolveThrowOnErrorStatus<TGlobalOptions, TRequestOptions> =
  TRequestOptions extends { throwOnErrorStatus: infer TRequestThrow }
    ? TRequestThrow
    : TGlobalOptions extends { throwOnErrorStatus: infer TGlobalThrow }
      ? TGlobalThrow
      : false;

type TransformCookies<TValidatedInput> = TValidatedInput extends {
  cookies: any;
}
  ? Omit<TValidatedInput, "cookies"> & {
      cookies?: {
        [K in keyof TValidatedInput["cookies"]]?: TValidatedInput["cookies"][K];
      };
    }
  : TValidatedInput;

export type InferRouteInput<
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
        ? TransformCookies<TValidatedInput>
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

// type InferRouteOutput<
//   TRouter extends TypiRouter<any>,
//   TPath extends keyof TRouter["routes"],
//   TMethod extends keyof TRouter["routes"][TPath],
// > =
//   TRouter["routes"][TPath][TMethod] extends RouteDefinition<
//     any,
//     any,
//     infer TMiddlewares,
//     infer THandlerOutput
//   >
//     ?
//         | ExtractRoutesOutputsByStatusCodes<TMiddlewares, HttpErrorStatusKey>
//         | THandlerOutput // Has actual middlewares
//     : never;

export type InferRouteOutput<
  TRouter extends TypiRouter<any>,
  TPath extends keyof TRouter["routes"],
  TMethod extends keyof TRouter["routes"][TPath],
  TGlobalOptions,
  TRequestOptions,
> =
  TRouter["routes"][TPath][TMethod] extends RouteDefinition<
    any,
    any,
    infer TMiddlewares,
    infer THandlerOutput
  >
    ? ResolveThrowOnErrorStatus<TGlobalOptions, TRequestOptions> extends true
      ? // When resolved throwOnErrorStatus is true, only return success responses
        Extract<THandlerOutput, { status: "OK" }>
      : // When resolved throwOnErrorStatus is false, return all possible responses
        | ExtractRoutesOutputsByStatusCodes<TMiddlewares, HttpErrorStatusKey>
          | THandlerOutput
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
            InferRouteOutput<TRouter, Path, Method, {}, {}>,
            {
              status: "OK";
            }
          >["data"];
        }
      : never;
};
