import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { ResetResponseDescription } from '../http/response/ResetResponseDescription';
import type { ResponseDescription } from '../http/response/ResponseDescription';
import type { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';

/**
 * Handles PUT {@link Operation}s.
 * Calls the setRepresentation function from a {@link ResourceStore}.
 */
export class PutOperationHandler extends OperationHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'PUT') {
      throw new NotImplementedHttpError('This handler only supports PUT operations');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    if (typeof input.body !== 'object') {
      this.logger.warn('No body specified on PUT request');
      throw new BadRequestHttpError('PUT operations require a body');
    }
    await this.store.setRepresentation(input.target, input.body);
    return new ResetResponseDescription();
  }
}
