import { type TypiRouter } from "../server";
import { HttpMethod } from "../http";
import { RouteHandlerInput } from "./input";
import { RouteHandlerContext } from "./context";
import { RouteHandlerResponse } from "./response";

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
