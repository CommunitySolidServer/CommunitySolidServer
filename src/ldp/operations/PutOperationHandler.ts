import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import type { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';
import type { ResponseDescription } from './ResponseDescription';

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
      throw new UnsupportedHttpError('This handler only supports PUT operations');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    if (typeof input.body !== 'object') {
      this.logger.warn('No body specified on PUT request');
      throw new UnsupportedHttpError('PUT operations require a body');
    }
    await this.store.setRepresentation(input.target, input.body);
    return { identifier: input.target };
  }
}
