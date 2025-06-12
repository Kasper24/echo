import z from "zod";

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
