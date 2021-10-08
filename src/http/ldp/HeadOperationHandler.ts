import type { ResourceStore } from '../../storage/ResourceStore';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { OkResponseDescription } from '../output/response/OkResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import type { OperationHandlerInput } from './OperationHandler';
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

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'HEAD') {
      throw new NotImplementedHttpError('This handler only supports HEAD operations');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    const body = await this.store.getRepresentation(operation.target, operation.preferences, operation.conditions);

    // Close the Readable as we will not return it.
    body.data.destroy();

    return new OkResponseDescription(body.metadata);
  }
}
