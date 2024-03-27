import type { HttpError } from '../errors/HttpError';
import { AsyncHandler } from './AsyncHandler';

/**
 * Utility handler that can handle all input and always throws the given error.
 */
export class StaticThrowHandler extends AsyncHandler<unknown, never> {
  private readonly error: HttpError;

  public constructor(error: HttpError) {
    super();
    this.error = error;
  }

  public async handle(): Promise<never> {
    throw this.error;
  }
}
