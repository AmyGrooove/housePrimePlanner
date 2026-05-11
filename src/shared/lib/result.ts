export type Result<T, E = string> =
  | { success: true; value: T }
  | { success: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({
  success: true,
  value,
});

export const err = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

export const isOk = <T, E>(result: Result<T, E>): result is { success: true; value: T } =>
  result.success;

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success;

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.success) {
    return result.value;
  }
  throw new Error(`Unwrap failed: ${result.error}`);
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  result.success ? result.value : defaultValue;

export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.success ? ok(fn(result.value)) : result;

export const mapErr = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  result.success ? result : err(fn(result.error));

export const flatMap = <T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> =>
  result.success ? fn(result.value) : result;
