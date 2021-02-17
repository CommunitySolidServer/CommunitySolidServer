import type { ResourceStore } from '../../storage/ResourceStore';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { OkResponseDescription } from '../http/response/OkResponseDescription';
import type { ResponseDescription } from '../http/response/ResponseDescription';
import type { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';

/**
 * Handles HEAD {@link Operation}s.
 * Calls the getRepresentation function from a {@link ResourceStore}.
 */
export class HeadOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'HEAD') {
      throw new NotImplementedHttpError('This handler only supports HEAD operations');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    const body = await this.store.getRepresentation(input.target, input.preferences);

    // Close the Readable as we will not return it.
    body.data.destroy();

    input.authorization?.addMetadata(body.metadata);

    return new OkResponseDescription(body.metadata);
  }
}
