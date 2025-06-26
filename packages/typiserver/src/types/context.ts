import { type Request, type Response } from "express";
import { HttpSuccessStatusKey, HttpErrorStatusKey } from "../http";
import { RouteHandlerInput, RouteHandlerValidatedInput } from "./input";
import { MiddlewareHandlers } from "./route";
import { UnionToIntersection } from "./util";

import {
  ExtractRoutesOutputsByStatusCodes,
  RouteHandlerErrorDataResponse,
  RouteHandlerResponse,
} from "./response";

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
      data: TData,
    ): RouteHandlerResponse<"OK", TData>;
  };
  error: <TErrorKey extends HttpErrorStatusKey>(
    key: TErrorKey,
    message?: string,
  ) => RouteHandlerResponse<TErrorKey, RouteHandlerErrorDataResponse>;
};
