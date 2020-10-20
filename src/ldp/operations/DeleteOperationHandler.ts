import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import type { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';
import type { ResponseDescription } from './ResponseDescription';

/**
 * Handles DELETE {@link Operation}s.
 * Calls the deleteResource function from a {@link ResourceStore}.
 */
export class DeleteOperationHandler extends OperationHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'DELETE') {
      this.logger.warn('This handler only supports DELETE operations.');
      throw new UnsupportedHttpError('This handler only supports DELETE operations.');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    await this.store.deleteResource(input.target);
    return { identifier: input.target };
  }
}
