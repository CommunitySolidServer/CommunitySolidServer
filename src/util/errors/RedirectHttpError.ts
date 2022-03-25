import type { HttpErrorClass, HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass, HttpError } from './HttpError';

/**
 * An error corresponding to a 3xx status code.
 * Includes the location it redirects to.
 */
export class RedirectHttpError<TCode extends number = number> extends HttpError<TCode> {
  public readonly location: string;

  public constructor(statusCode: TCode, name: string, location: string, message?: string, options?: HttpErrorOptions) {
    super(statusCode, name, message, options);
    this.location = location;
  }

  public static isInstance(error: any): error is RedirectHttpError {
    return HttpError.isInstance(error) && typeof (error as any).location === 'string';
  }
}

/**
 * Interface describing what a {@link RedirectHttpError} class should look like.
 * Makes sure a `location` value is always needed.
 */
export interface RedirectHttpErrorClass<TCode extends number = number> extends Omit<HttpErrorClass<TCode>, 'new'> {
  new(location: string, message?: string, options?: HttpErrorOptions): RedirectHttpError<TCode>;
}

/**
 * Generates a {@link RedirectHttpErrorClass}, similar to how {@link generateHttpErrorClass} works.
 * The difference is that here a `location` field also gets set and the `getInstance` method
 * also uses the {@link RedirectHttpError.isInstance} function.
 */
export function generateRedirectHttpErrorClass<TCode extends number>(
  code: TCode,
  name: string,
): RedirectHttpErrorClass<TCode> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const BaseClass = generateHttpErrorClass(code, name);

  // Need to extend `BaseClass` instead of `RedirectHttpError` to have the required static methods
  return class SpecificRedirectHttpError extends BaseClass implements RedirectHttpError {
    public readonly location: string;

    public constructor(location: string, message?: string, options?: HttpErrorOptions) {
      super(message, options);
      this.location = location;
    }

    public static isInstance(error: any): error is SpecificRedirectHttpError {
      return RedirectHttpError.isInstance(error) && error.statusCode === code;
    }
  };
}
