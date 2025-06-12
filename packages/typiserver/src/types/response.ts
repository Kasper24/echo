import {
  HttpStatusKey,
  HttpSuccessStatusKey,
  HttpErrorStatusKey,
  HttpErrorStatusCode,
} from "../http";
import { RouteHandler } from "./route";

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

type Serialize<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialize<U>[]
    : T extends Record<string, any>
      ? { [K in keyof T]: Serialize<T[K]> }
      : T;

export interface RouteHandlerErrorDataResponse {
  error: {
    key: HttpErrorStatusKey;
    code: HttpErrorStatusCode;
    label: string;
    message: string;
  };
}

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
