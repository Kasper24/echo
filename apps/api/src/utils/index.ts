type Success<T> = [null, T];
type Failure<E> = [E, null];
type Result<T, E = Error> = Success<T> | Failure<E>;

const attempt = async <T, E = Error>(
  fn: (() => T) | Promise<T>,
): Promise<Result<T, E>> => {
  try {
    const data = await (fn instanceof Promise
      ? fn
      : Promise.resolve().then(fn));
    return [null, data];
  } catch (error) {
    return [error as E, null];
  }
};

export { attempt };
