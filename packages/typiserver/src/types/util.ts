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
