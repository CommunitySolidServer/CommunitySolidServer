import { DataFactory } from 'n3';
import type { NamedNode, Quad, Quad_Subject } from 'rdf-js';
import { toNamedTerm } from '../TermUtil';
import { SOLID_ERROR } from '../Vocabularies';
import { isError } from './ErrorUtil';
import quad = DataFactory.quad;

export interface HttpErrorOptions {
  cause?: unknown;
  errorCode?: string;
  details?: NodeJS.Dict<unknown>;
}

/**
 * Returns a URI that is unique for the given status code.
 */
export function generateHttpErrorUri(statusCode: number): NamedNode {
  return toNamedTerm(`${SOLID_ERROR.namespace}H${statusCode}`);
}

/**
 * A class for all errors that could be thrown by Solid.
 * All errors inheriting from this should fix the status code thereby hiding the HTTP internals from other components.
 */
export class HttpError<T extends number = number> extends Error implements HttpErrorOptions {
  public readonly statusCode: T;
  public readonly cause?: unknown;
  public readonly errorCode: string;
  public readonly details?: NodeJS.Dict<unknown>;

  /**
   * Creates a new HTTP error. Subclasses should call this with their fixed status code.
   * @param statusCode - HTTP status code needed for the HTTP response.
   * @param name - Error name. Useful for logging and stack tracing.
   * @param message - Error message.
   * @param options - Optional options.
   */
  public constructor(statusCode: T, name: string, message?: string, options: HttpErrorOptions = {}) {
    super(message);
    this.statusCode = statusCode;
    this.name = name;
    this.cause = options.cause;
    this.errorCode = options.errorCode ?? `H${statusCode}`;
    this.details = options.details;
  }

  public static isInstance(error: any): error is HttpError {
    return isError(error) && typeof (error as any).statusCode === 'number';
  }

  /**
   * Returns quads representing metadata relevant to this error.
   */
  public generateMetadata(subject: Quad_Subject | string): Quad[] {
    // The reason we have this here instead of the generate function below
    // is because we still want errors created with `new HttpError` to be treated identical
    // as errors created with the constructor of the error class corresponding to that specific status code.
    return [
      quad(toNamedTerm(subject), SOLID_ERROR.terms.errorResponse, generateHttpErrorUri(this.statusCode)),
    ];
  }
}

/**
 * Interface describing what an HttpError class should look like.
 * This helps us make sure all HttpError classes have the same utility static functions.
 */
export interface HttpErrorClass<TCode extends number = number> {
  new(message?: string, options?: HttpErrorOptions): HttpError<TCode>;

  /**
   * The status code corresponding to this error class.
   */
  readonly statusCode: TCode;
  /**
   * A unique URI identifying this error class.
   */
  readonly uri: NamedNode;
  /**
   * Checks if the given error is an instance of this class.
   */
  readonly isInstance: (error: any) => error is HttpError<TCode>;
}

/**
 * Generates a new HttpError class with the given status code and name.
 * In general, status codes are used to uniquely identify error types,
 * so there should be no 2 classes with the same value there.
 *
 * To make sure Components.js can work with these newly generated classes,
 * the generated class should be called `BaseHttpError` as that name is an entry in `.componentsignore`.
 * The actual class should then extend `BaseHttpError` and have a correct constructor,
 * so the Components.js generator can generate the correct components JSON-LD file during build.
 */
export function generateHttpErrorClass<TCode extends number>(statusCode: TCode, name: string): HttpErrorClass<TCode> {
  return class SpecificHttpError extends HttpError<TCode> {
    public static readonly statusCode = statusCode;
    public static readonly uri = generateHttpErrorUri(statusCode);

    public constructor(message?: string, options?: HttpErrorOptions) {
      super(statusCode, name, message, options);
    }

    public static isInstance(error: any): error is SpecificHttpError {
      return HttpError.isInstance(error) && error.statusCode === statusCode;
    }
  };
}
