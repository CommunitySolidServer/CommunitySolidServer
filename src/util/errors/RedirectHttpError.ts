import { DataFactory } from 'n3';
import { SOLID_HTTP } from '../Vocabularies';
import type { HttpErrorClass, HttpErrorOptions } from './HttpError';
import { generateHttpErrorUri, HttpError } from './HttpError';

/**
 * An error corresponding to a 3xx status code.
 * Includes the location it redirects to.
 */
export class RedirectHttpError<TCode extends number = number> extends HttpError<TCode> {
  public readonly location: string;

  public constructor(statusCode: TCode, name: string, location: string, message?: string, options?: HttpErrorOptions) {
    super(statusCode, name, message, options);
    this.location = location;
    this.metadata.add(SOLID_HTTP.terms.location, DataFactory.namedNode(location));
  }

  public static isInstance(error: unknown): error is RedirectHttpError {
    return HttpError.isInstance(error) && typeof (error as RedirectHttpError).location === 'string';
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
  return class SpecificRedirectHttpError extends RedirectHttpError<TCode> {
    public static readonly statusCode = code;
    public static readonly uri = generateHttpErrorUri(code);

    public constructor(location: string, message?: string, options?: HttpErrorOptions) {
      super(code, name, location, message, options);
    }

    public static isInstance(error: unknown): error is SpecificRedirectHttpError {
      return RedirectHttpError.isInstance(error) && error.statusCode === code;
    }
  };
}
