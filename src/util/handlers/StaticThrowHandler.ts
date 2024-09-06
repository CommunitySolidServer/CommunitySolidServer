import type { HttpError, HttpErrorClass } from '../errors/HttpError';
import { AsyncHandler } from './AsyncHandler';

/**
 * Utility handler that can handle all input and always throws an instance of the given error.
 */
export class StaticThrowHandler extends AsyncHandler<unknown, never> {
  protected readonly error: HttpError;

  public constructor(error: HttpError) {
    super();
    this.error = error;
  }

  public async handle(): Promise<never> {
    // We are creating a new instance of the error instead of rethrowing the error,
    // as reusing the same error can cause problem as the metadata is then also reused.
    throw new (this.error.constructor as HttpErrorClass)();
  }
}
