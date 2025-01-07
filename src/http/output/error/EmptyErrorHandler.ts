import { NotImplementedHttpError } from '../../../util/errors/NotImplementedHttpError';
import { SOLID_ERROR } from '../../../util/Vocabularies';
import { ResponseDescription } from '../response/ResponseDescription';
import type { ErrorHandlerArgs } from './ErrorHandler';
import { ErrorHandler } from './ErrorHandler';

/**
 * An {@link ErrorHandler} that returns an error response without adding a body.
 * For certain status codes, such as 304, it is important to not change anything
 * to the headers, such as changing the content-type.
 *
 * The `statusCodes` array contains the status codes of error types a body should never be added.
 *
 * The `always` boolean can be set to true to indicate that all errors should be handled here.
 *
 * For errors of different status codes, a metadata field can be added
 * to indicate this specific error response should not receive a body.
 * The predicate should be `urn:npm:solid:community-server:error:emptyBody` and the value `true`.
 */
export class EmptyErrorHandler extends ErrorHandler {
  protected readonly statusCodes: number[];
  protected readonly always: boolean;

  public constructor(statusCodes = [ 304 ], always = false) {
    super();
    this.statusCodes = statusCodes;
    this.always = always;
  }

  public async canHandle({ error }: ErrorHandlerArgs): Promise<void> {
    if (this.always || this.statusCodes.includes(error.statusCode) ||
      error.metadata.get(SOLID_ERROR.terms.emptyBody)?.value === 'true') {
      return;
    }
    throw new NotImplementedHttpError();
  }

  public async handle({ error }: ErrorHandlerArgs): Promise<ResponseDescription> {
    return new ResponseDescription(error.statusCode, error.metadata);
  }
}
