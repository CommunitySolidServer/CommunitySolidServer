import { isError } from './ErrorUtil';

export interface HttpErrorOptions {
  cause?: unknown;
  errorCode?: string;
  details?: NodeJS.Dict<unknown>;
}

/**
 * A class for all errors that could be thrown by Solid.
 * All errors inheriting from this should fix the status code thereby hiding the HTTP internals from other components.
 */
export class HttpError extends Error {
  protected static readonly statusCode: number;
  public readonly statusCode: number;
  public readonly options: HttpErrorOptions;

  /**
   * Creates a new HTTP error. Subclasses should call this with their fixed status code.
   * @param statusCode - HTTP status code needed for the HTTP response.
   * @param name - Error name. Useful for logging and stack tracing.
   * @param message - Error message.
   * @param options - Optional options.
   */
  public constructor(statusCode: number, name: string, message?: string, options: HttpErrorOptions = {}) {
    super(message);
    this.statusCode = statusCode;
    this.name = name;
    this.options = options;
  }

  public static isInstance(error: any): error is HttpError {
    return isError(error) && typeof (error as any).statusCode === 'number';
  }
}
