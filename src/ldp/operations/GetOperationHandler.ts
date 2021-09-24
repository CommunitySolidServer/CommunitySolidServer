import type { ResourceStore } from '../../storage/ResourceStore';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { OkResponseDescription } from '../http/response/OkResponseDescription';
import type { ResponseDescription } from '../http/response/ResponseDescription';
import type { OperationHandlerInput } from './OperationHandler';
import { OperationHandler } from './OperationHandler';

/**
 * Handles GET {@link Operation}s.
 * Calls the getRepresentation function from a {@link ResourceStore}.
 */
export class GetOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'GET') {
      throw new NotImplementedHttpError('This handler only supports GET operations');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    const body = await this.store.getRepresentation(operation.target, operation.preferences, operation.conditions);

    return new OkResponseDescription(body.metadata, body.data);
  }
}
