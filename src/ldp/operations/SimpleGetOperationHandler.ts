import { ResourceStore } from '../../storage/ResourceStore';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';
import { ResponseDescription } from './ResponseDescription';

/**
 * Handles GET {@link Operation}s.
 * Calls the getRepresentation function from a {@link ResourceStore}.
 */
export class SimpleGetOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'GET') {
      throw new UnsupportedHttpError('This handler only supports GET operations.');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    const body = await this.store.getRepresentation(input.target, input.preferences);
    return { identifier: input.target, body };
  }
}
