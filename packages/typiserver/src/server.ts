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
import {
  HttpMethod,
  HttpErrorStatusKey,
  HttpErrorStatusCode,
  getStatus,
} from "./http";

const createTypiRouter = <TRoutes extends RouteMap>(
  routes: TRoutes,
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
  RouteDefinition: RouteDefinition<string, TInput, TMiddlewares, TOutput>,
): RouteDefinition<string, TInput, TMiddlewares, TOutput>;

function createTypiRouteHandler<
  TInput extends RouteHandlerInput,
  TOutput extends RouteHandlerResponse,
  TMiddlewares extends MiddlewareHandlers,
  TPath extends string = string,
>(
  path: TPath,
  RouteDefinition: RouteDefinition<TPath, TInput, TMiddlewares, TOutput>,
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
            config.middlewares as MiddlewareHandlers,
          );
        });
      }
    });
  }

  private sendResponse(res: Response, result: RouteHandlerResponse) {
    return res
      .status(getStatus(result.status).code)
      .send(serialize(result.data));
  }

  private makeZodSchemaFromPath(path: string) {
    const pathParts = path.split("/").filter((part) => part !== "");
    const pathSchema: Record<string, z.ZodTypeAny> = {};
    pathParts.forEach((part) => {
      if (part.startsWith(":")) {
        const paramName = part.slice(1);
        pathSchema[paramName] = z.string();
      }
    });
    return z.object(pathSchema);
  }

  private createBaseContext(req: Request, res: Response): RouteHandlerContext {
    return {
      input: {} as any,
      data: {} as any,
      request: req,
      response: res,
      success: (<TData extends Record<string, any>>(
        data?: TData,
      ): RouteHandlerResponse<"OK", TData extends undefined ? {} : TData> => {
        const successData = {
          status: "OK",
          data: (data ?? {}) as TData extends undefined ? {} : TData,
        };
        console.log(
          JSON.stringify(
            {
              time: new Date().toString(),
              request: {
                URL: req.originalUrl,
                method: req.method,
                body: req.body,
                path: req.params,
                query: req.query,
              },
              response: {
                status: "OK",
                data: successData.data,
              },
            },
            null,
            2,
          ),
        );
        return successData as any;
      }) as {
        (): RouteHandlerResponse<"OK", {}>;
        <TData extends Record<string, any>>(
          data: TData,
        ): RouteHandlerResponse<"OK", TData>;
      },
      error: <TErrorKey extends HttpErrorStatusKey>(
        key: TErrorKey,
        message?: string,
      ): RouteHandlerResponse<TErrorKey, RouteHandlerErrorDataResponse> => {
        const errorData = {
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
        console.error(
          JSON.stringify({
            time: new Date().toString(),
            request: {
              URL: req.originalUrl,
              method: req.method,
              body: req.body,
              path: req.params,
              query: req.query,
              status: errorData.status,
            },
            response: {
              status: errorData.status,
              data: errorData.data,
            },
          }),
          null,
          2,
        );
        return errorData;
      },
    };
  }

  private setNestedValue(obj: any, path: string[], value: any) {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        // Check if next key is numeric to create array vs object
        const nextKey = path[i + 1];
        current[key] = /^\d+$/.test(nextKey) ? [] : {};
      }
      current = current[key];
    }
    current[path[path.length - 1]] = value;
  }

  private transformFilesToBody(body: any, files: Express.Multer.File[]) {
    if (!files || files.length === 0) return body;

    const result = { ...body };

    files.forEach((file) => {
      // Parse nested field names like 'user[picture]' -> user.picture
      const fieldPath = file.fieldname.split(/[\[\]]+/).filter(Boolean);

      // Create a File-like object that matches your Zod schema
      const fileObject = new File([file.buffer], file.originalname, {
        type: file.mimetype,
      });

      // Set the file in the correct nested position
      this.setNestedValue(result, fieldPath, fileObject);
    });

    return result;
  }

  private parseInputs<TInput extends RouteHandlerInput>(
    req: Request,
    ctx: RouteHandlerContext,
    path: string,
    input: Exact<TInput, RouteHandlerInput>,
  ) {
    const parsedInput: Record<string, any> = {};

    // Transform multer files back into the body structure
    const transformedBody = this.transformFilesToBody(
      req.body,
      req.files as Express.Multer.File[],
    );

    const inputsToParse: {
      key: keyof RouteHandlerInput | "path";
      source: any;
      schema: z.ZodTypeAny | undefined;
    }[] = [
      { key: "headers", source: req.headers, schema: input?.headers },
      { key: "body", source: transformedBody, schema: input?.body },
      {
        key: "path",
        source: req.params,
        schema: this.makeZodSchemaFromPath(path),
      },
      { key: "query", source: req.query, schema: input?.query },
      { key: "cookies", source: req.cookies, schema: input?.cookies },
    ];

    for (const { key, source, schema } of inputsToParse) {
      if (schema) {
        const result = schema.safeParse(source);
        if (!result.success) {
          return {
            error: ctx.error(
              "BAD_REQUEST",
              result.error instanceof ZodError
                ? result.error.message
                : `Invalid ${key}`,
            ),
          };
        }
        parsedInput[key] = result.data;
      }
    }

    return { parsedInput };
  }

  private async executeMiddlewares<
    TMiddlewaresHandlers extends MiddlewareHandlers,
  >(baseCtx: RouteHandlerContext, middlewares?: TMiddlewaresHandlers) {
    let middlewareData: Record<string, any> = {};

    for (const middleware of middlewares ?? []) {
      const middlewareCtx: RouteHandlerContext = {
        ...baseCtx,
        data: { ...middlewareData } as any,
      };
      try {
        const result = await middleware(middlewareCtx);

        if (result.status !== "OK") {
          return {
            error: middlewareCtx.error(
              result.status as HttpErrorStatusKey,
              result.data.error.message || "An unexpected error occurred",
            ),
          };
        } else {
          if (result.data !== null) {
            middlewareData = { ...middlewareData, ...result.data };
          }
        }
      } catch (error: unknown) {
        return {
          error: baseCtx.error(
            "INTERNAL_SERVER_ERROR",
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          ),
        };
      }
    }

    return { middlewareData };
  }

  private async routeHandler(
    req: Request,
    res: Response,
    path: string,
    input: RouteHandlerInput,
    handler: RouteHandler<any, any, any, any>,
    middlewares?: MiddlewareHandlers,
  ) {
    // Create base context
    const baseCtx = this.createBaseContext(req, res);

    // Parse inputs
    const inputResult = this.parseInputs(req, baseCtx, path, input);
    if (inputResult.error) return this.sendResponse(res, inputResult.error);

    // Update context with parsed input
    const ctxWithParsedInput = {
      ...baseCtx,
      input: inputResult.parsedInput,
    };

    // Execute middlewares
    const middlewareResult = await this.executeMiddlewares(
      ctxWithParsedInput,
      middlewares,
    );
    if (middlewareResult.error)
      return this.sendResponse(res, middlewareResult.error);

    // Create final context and execute handler
    const finalCtx = {
      ...ctxWithParsedInput,
      data: { ...middlewareResult.middlewareData } as any,
    };

    // Execute the handler with the final context
    try {
      const result = await handler(finalCtx as any);
      return this.sendResponse(res, result);
    } catch (error: unknown) {
      return this.sendResponse(
        res,
        finalCtx.error(
          "INTERNAL_SERVER_ERROR",
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        ),
      );
    }
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
    middlewares?: TMiddlewaresHandlers,
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
    this.router[method as HttpMethod](path, (req: Request, res: Response) =>
      this.routeHandler(req, res, path, input, handler, middlewares),
    );
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
      >,
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
          middlewaresOrHandler as TMiddlewaresHandlers,
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
        [] as unknown as TMiddlewaresHandlers,
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
    router: TypiRouter<TSubRoutes>,
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
