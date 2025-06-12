export type StripLeadingSlash<S extends string> = S extends `/${infer R}`
  ? R
  : S;
export type MaybePromise<T> = Promise<T> | T;
