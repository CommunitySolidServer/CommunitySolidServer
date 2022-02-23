import type { HttpErrorOptions } from './HttpError';
import { HttpError } from './HttpError';

/**
 * Abstract class representing a 3xx redirect.
 */
export abstract class RedirectHttpError extends HttpError {
  public readonly location: string;

  protected constructor(statusCode: number, location: string, name: string, message?: string,
    options?: HttpErrorOptions) {
    super(statusCode, name, message, options);
    this.location = location;
  }

  public static isInstance(error: any): error is RedirectHttpError {
    return HttpError.isInstance(error) && typeof (error as any).location === 'string';
  }
}
