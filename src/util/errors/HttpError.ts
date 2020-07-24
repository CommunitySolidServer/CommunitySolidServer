/**
 * An abstract class for all errors that could be thrown by Solid.
 * All errors inheriting from this should fix the status code thereby hiding the HTTP internals from other components.
 */
export abstract class HttpError extends Error {
  public statusCode: number;

  /**
   * Creates a new HTTP error. Subclasses should call this with their fixed status code.
   * @param statusCode - HTTP status code needed for the HTTP response.
   * @param name - Error name. Useful for logging and stack tracing.
   * @param message - Message to be thrown.
   */
  protected constructor(statusCode: number, name: string, message?: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = name;
  }
}
