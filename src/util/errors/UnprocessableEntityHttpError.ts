import type { HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass } from './HttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateHttpErrorClass(422, 'UnprocessableEntityHttpError');

/**
 * An error thrown when the server understands the content-type but can't process the instructions.
 */
export class UnprocessableEntityHttpError extends BaseHttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(message, options);
  }
}
