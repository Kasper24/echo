import { Router, type Request, type Response } from "express";
import { serialize } from "superjson";
import { z, ZodError } from "zod";
import {
  RouteHandlerContext,
  RouteHandlerResponse,
  TypiRoute,
  MiddlewareHandlers,
  RouteDefinition,
  RouteHandlerInput,
  RouteHandler,
  RouteMap,
  Exact,
  RouteHandlerErrorDataResponse,
} from "./types";
``;
import {
  HttpMethod,
  HttpStatusKey,
  HttpErrorStatusKey,
  HttpErrorStatusCode,
  getStatus,
} from "./http";
import { error } from "console";

const createTypiRouter = <TRoutes extends RouteMap>(
  routes: TRoutes
): TypiRouter<TRoutes> => {
  return new TypiRouter(routes);
};

const createTypiRoute = <TRoute extends TypiRoute>(route: TRoute): TRoute => {
  return route;
};

function createTypiRouteHandler<
  TInput extends RouteHandlerInput,
  TOutput extends RouteHandlerResponse,
  TMiddlewares extends MiddlewareHandlers,
>(
  RouteDefinition: RouteDefinition<string, TInput, TMiddlewares, TOutput>
): RouteDefinition<string, TInput, TMiddlewares, TOutput>;

function createTypiRouteHandler<
  TInput extends RouteHandlerInput,
  TOutput extends RouteHandlerResponse,
  TMiddlewares extends MiddlewareHandlers,
  TPath extends string = string,
>(
  path: TPath,
  RouteDefinition: RouteDefinition<TPath, TInput, TMiddlewares, TOutput>
): RouteDefinition<TPath, TInput, TMiddlewares, TOutput>;

function createTypiRouteHandler(pathOrRouteDef: any, maybeRouteDef?: any): any {
  if (maybeRouteDef !== undefined) {
    return maybeRouteDef;
  }
  return pathOrRouteDef;
}

class TypiRouter<TRoutes extends RouteMap = RouteMap> {
  public router: Router;
  public routes: TRoutes;

  constructor(routes: TRoutes) {
    this.router = Router();
    this.routes = routes;

    Object.entries(this.routes).forEach(([path, route]) => {
      if (route instanceof TypiRouter) {
        this.use(path, route);
      } else {
        Object.entries(route).forEach(([method, config]) => {
          this.registerMethod(
            method as HttpMethod,
            path,
            config.input as RouteHandlerInput,
            config.handler as RouteHandler<
              string,
              RouteHandlerInput,
              MiddlewareHandlers,
              RouteHandlerResponse
            >,
            config.middlewares as MiddlewareHandlers
          );
        });
      }
    });
  }

  private sendResponse(
    res: Response,
    status: HttpStatusKey,
    data: Record<string, any> = {}
  ) {
    return res.status(getStatus(status).code).send(serialize(data));
  }

  private registerMethod<
    TPath extends string,
    TInput extends RouteHandlerInput,
    TMiddlewaresHandlers extends MiddlewareHandlers,
    TOutput extends RouteHandlerResponse,
  >(
    method: HttpMethod,
    path: string,
    input: Exact<TInput, RouteHandlerInput>,
    handler: RouteHandler<TPath, TInput, TMiddlewaresHandlers, TOutput>,
    middlewares?: TMiddlewaresHandlers
  ): TypiRouter<
    TRoutes & {
      [key in TPath]: {
        [key in typeof method]: RouteDefinition<
          TPath,
          TInput,
          TMiddlewaresHandlers,
          TOutput
        >;
      };
    }
  > {
    const makeZodSchemaFromPath = (path: string) => {
      const pathParts = path.split("/").filter((part) => part !== "");
      const pathSchema: Record<string, z.ZodTypeAny> = {};
      pathParts.forEach((part) => {
        if (part.startsWith(":")) {
          const paramName = part.slice(1);
          pathSchema[paramName] = z.string();
        }
      });
      return z.object(pathSchema);
    };

    const handlerWrapper = async (req: Request, res: Response) => {
      const parsedInput: Record<string, any> = {};
      const inputsToParse: {
        key: keyof RouteHandlerInput | "path";
        source: any;
        schema: z.ZodTypeAny | undefined;
      }[] = [
        {
          key: "headers",
          source: req.headers,
          schema: input?.headers,
        },
        { key: "body", source: req.body, schema: input?.body },
        {
          key: "path",
          source: req.params,
          schema: makeZodSchemaFromPath(path),
        },
        { key: "query", source: req.query, schema: input?.query },
        {
          key: "cookies",
          source: req.cookies,
          schema: input?.cookies,
        },
      ];

      for (const { key, source, schema } of inputsToParse) {
        if (schema) {
          const result = schema.safeParse(source);
          if (!result.success) {
            console.error(result.error);
            return this.sendResponse(res, "BAD_REQUEST", {
              error: {
                key: "BAD_REQUEST" as HttpErrorStatusKey,
                code: getStatus("BAD_REQUEST").code,
                label: getStatus("BAD_REQUEST").label,
                message:
                  error instanceof ZodError ? error.message : `Invalid ${key}`,
              },
            });
          }
          parsedInput[key] = result.data;
        }
      }

      const baseCtx: RouteHandlerContext = {
        input: parsedInput as any,
        data: {} as any,
        request: req,
        response: res,
        success: (<TData extends Record<string, any>>(
          data?: TData
        ): RouteHandlerResponse<"OK", TData extends undefined ? {} : TData> => {
          return {
            status: "OK",
            data: (data ?? {}) as TData extends undefined ? {} : TData,
          };
        }) as {
          (): RouteHandlerResponse<"OK", {}>;
          <TData extends Record<string, any>>(
            data: TData
          ): RouteHandlerResponse<"OK", TData>;
        },
        error: <TErrorKey extends HttpErrorStatusKey>(
          key: TErrorKey,
          message?: string
        ): RouteHandlerResponse<TErrorKey, RouteHandlerErrorDataResponse> => {
          return {
            status: key,
            data: {
              error: {
                key: key,
                code: getStatus(key).code as HttpErrorStatusCode,
                label: getStatus(key).label,
                message: message ?? "An unexpected error occurred.",
              },
            },
          };
        },
      };

      let middlewareData = {};

      for (const middleware of middlewares ?? []) {
        const middlewareCtx: RouteHandlerContext = {
          ...baseCtx,
          data: { ...middlewareData } as any,
        };
        try {
          const result = await middleware(middlewareCtx);

          if (result.status !== "OK") {
            return this.sendResponse(res, result.status, {
              error: {
                key: result.status as HttpErrorStatusKey,
                code: result.data.error.code,
                label: result.data.error.label,
                message:
                  result.data.error.message || "An unexpected error occurred",
              },
            });
          } else {
            if (result.data !== null) {
              middlewareData = { ...middlewareData, ...result.data };
            }
          }
        } catch (error: unknown) {
          console.error(error);
          return this.sendResponse(res, "INTERNAL_SERVER_ERROR", {
            error: {
              key: "INTERNAL_SERVER_ERROR" as HttpErrorStatusKey,
              code: getStatus("INTERNAL_SERVER_ERROR").code,
              label: getStatus("INTERNAL_SERVER_ERROR").label,
              message:
                error instanceof Error
                  ? error.message
                  : "An unexpected error occurred",
            },
          });
        }
      }

      const finalCtx = {
        ...baseCtx,
        data: { ...middlewareData } as any,
      };

      try {
        const result = await handler(finalCtx as any);
        return this.sendResponse(res, result.status, result.data);
      } catch (error: unknown) {
        console.error(error);

        return this.sendResponse(res, "INTERNAL_SERVER_ERROR", {
          error: {
            key: "INTERNAL_SERVER_ERROR" as HttpErrorStatusKey,
            code: getStatus("INTERNAL_SERVER_ERROR").code,
            label: getStatus("INTERNAL_SERVER_ERROR").label,
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
          },
        });
      }
    };
    this.router[method as HttpMethod](path, handlerWrapper);
    return this as any;
  }

  private createHttpMethod<TMethod extends HttpMethod>(method: TMethod) {
    return <
      TPath extends string,
      TInput extends RouteHandlerInput,
      TMiddlewaresHandlers extends MiddlewareHandlers,
      TOutput extends RouteHandlerResponse,
    >(
      path: TPath,
      input: Exact<TInput, RouteHandlerInput>,
      middlewaresOrHandler:
        | TMiddlewaresHandlers
        | RouteHandler<TPath, TInput, TMiddlewaresHandlers, TOutput>,
      handlerOrNothing?: RouteHandler<
        TPath,
        TInput,
        TMiddlewaresHandlers,
        TOutput
      >
    ): TypiRouter<
      TRoutes & {
        [key in TPath]: {
          [key in TMethod]: RouteDefinition<
            TPath,
            TInput,
            TMiddlewaresHandlers,
            any
          >;
        };
      }
    > => {
      if (handlerOrNothing) {
        return this.registerMethod(
          method,
          path,
          input,
          handlerOrNothing,
          middlewaresOrHandler as TMiddlewaresHandlers
        );
      }

      // If handlerOrNothing is not provided, middlewaresOrHandler is the handler
      // and we provide an empty array for middlewares
      return this.registerMethod(
        method,
        path,
        input,
        middlewaresOrHandler as RouteHandler<
          TPath,
          TInput,
          TMiddlewaresHandlers,
          TOutput
        >,
        [] as unknown as TMiddlewaresHandlers
      );
    };
  }

  get = this.createHttpMethod("get");
  post = this.createHttpMethod("post");
  put = this.createHttpMethod("put");
  delete = this.createHttpMethod("delete");
  patch = this.createHttpMethod("patch");
  options = this.createHttpMethod("options");
  head = this.createHttpMethod("head");
  all = this.createHttpMethod("all");
  use<TPath extends string, TSubRoutes extends RouteMap>(
    path: TPath,
    router: TypiRouter<TSubRoutes>
  ): TypiRouter<
    TRoutes & {
      [key in TPath]: TypiRouter<TSubRoutes>;
    }
  > {
    this.router.use(path, router.router);
    return this as any;
  }
}

export {
  type TypiRouter,
  createTypiRouter,
  createTypiRoute,
  createTypiRouteHandler,
};
