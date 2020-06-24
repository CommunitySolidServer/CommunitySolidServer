import { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';
import { ResourceStore } from '../../storage/ResourceStore';
import { ResponseDescription } from './ResponseDescription';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';

/**
 * Handles DELETE {@link Operation}s.
 * Calls the deleteResource function from a {@link ResourceStore}.
 */
export class SimpleDeleteOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'DELETE') {
      throw new UnsupportedHttpError('This handler only supports DELETE operations.');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    await this.store.deleteResource(input.target);
    return { identifier: input.target };
  }
}
