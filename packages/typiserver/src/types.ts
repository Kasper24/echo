import { type Request, type Response } from "express";
import z from "zod";
import { type TypiRouter } from "./server";

import {
  HttpMethod,
  HttpStatusKey,
  HttpSuccessStatusKey,
  HttpErrorStatusKey,
  HttpErrorStatusCode,
} from "./http";

export type ExtractRoutesOutputsByStatusCodes<
  TRoutes extends RouteHandler[],
  TStatusName extends HttpStatusKey,
> = {
  [K in keyof TRoutes]: Awaited<ReturnType<TRoutes[K]>> extends infer TOutput
    ? TOutput extends {
        status: infer S;
      }
      ? S extends TStatusName
        ? TOutput
        : never
      : never
    : never;
}[number];

export type UnionToIntersection<U> = (
  U extends any ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

export type Exact<T, TShape> = T extends TShape
  ? Exclude<keyof T, keyof TShape> extends never
    ? T
    : never
  : never;

export type RouteHandlerInput = {
  headers?: z.ZodObject<Record<string, z.ZodType>>;
  body?: z.ZodObject<Record<string, z.ZodType>>;
  query?: z.ZodObject<Record<string, z.ZodType>>;
  cookies?: z.ZodObject<Record<string, z.ZodType>>;
};

export type ExtractPathParams<TPath extends string> =
  TPath extends `${string}/:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractPathParams<`/${Rest}`>
    : TPath extends `${string}/:${infer Param}`
      ? { [K in Param]: string }
      : {};

export type RouteHandlerValidatedInput<
  TInput extends RouteHandlerInput,
  TPath extends string,
> = {
  [K in keyof TInput as TInput[K] extends undefined
    ? never
    : K]: TInput[K] extends z.ZodType ? z.infer<TInput[K]> : undefined;
} & ([keyof ExtractPathParams<TPath>] extends [never]
  ? {} // no path params, don't add path
  : { path: ExtractPathParams<TPath> });

export type RouteHandlerContext<
  TPath extends string = string,
  TInput extends RouteHandlerInput = RouteHandlerInput,
  TMiddlewares extends MiddlewareHandlers = never,
> = {
  input: RouteHandlerValidatedInput<TInput, TPath>;
  data: UnionToIntersection<
    ExtractRoutesOutputsByStatusCodes<
      TMiddlewares,
      HttpSuccessStatusKey
    >["data"]
  >;
  request: Request;
  response: Response;
  success: {
    (): RouteHandlerResponse<"OK", {}>;
    <TData extends Record<string, any>>(
      data: TData
    ): RouteHandlerResponse<"OK", TData>;
  };
  error: <TErrorKey extends HttpErrorStatusKey>(
    key: TErrorKey,
    message?: string
  ) => RouteHandlerResponse<TErrorKey, RouteHandlerErrorDataResponse>;
};

export interface RouteHandlerErrorDataResponse {
  error: {
    key: HttpErrorStatusKey;
    code: HttpErrorStatusCode;
    label: string;
    message: string;
  };
}

type Serialize<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialize<U>[]
    : T extends Record<string, any>
      ? { [K in keyof T]: Serialize<T[K]> }
      : T;

export type RouteHandlerResponse<
  TStatusKey extends HttpStatusKey = HttpStatusKey,
  TData = TStatusKey extends HttpErrorStatusKey
    ? RouteHandlerErrorDataResponse
    : TStatusKey extends HttpSuccessStatusKey
      ? Record<string, any>
      : never,
> = {
  status: TStatusKey;
  data: TData;
};

export type MiddlewareHandlers = RouteHandler[];

export type RouteHandler<
  TPath extends string = string,
  TInput extends RouteHandlerInput = RouteHandlerInput,
  TMiddlewares extends MiddlewareHandlers = never,
  TOutput extends RouteHandlerResponse = RouteHandlerResponse,
> = (
  ctx: RouteHandlerContext<TPath, TInput, TMiddlewares>
) => TOutput | Promise<TOutput>;

export type RouteDefinition<
  TPath extends string = string,
  TInput extends RouteHandlerInput = RouteHandlerInput,
  TMiddlewares extends MiddlewareHandlers = never,
  TOutput extends RouteHandlerResponse = RouteHandlerResponse,
> = {
  middlewares?: TMiddlewares;
  input?: TInput;
  handler: RouteHandler<TPath, TInput, TMiddlewares, TOutput>;
};

export type TypiRoute = {
  [Method in HttpMethod]?: RouteDefinition<any, any, any, any>;
};

export type RouteMap = {
  [TPath in string]: TypiRoute | TypiRouter<any>;
};
