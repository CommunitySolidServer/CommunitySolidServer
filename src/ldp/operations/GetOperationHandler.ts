import type { ResourceStore } from '../../storage/ResourceStore';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { OkResponseDescription } from '../http/response/OkResponseDescription';
import type { ResponseDescription } from '../http/response/ResponseDescription';
import type { Operation } from './Operation';
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

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'GET') {
      throw new UnsupportedHttpError('This handler only supports GET operations');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    const body = await this.store.getRepresentation(input.target, input.preferences);
    return new OkResponseDescription(body.metadata, body.data);
  }
}
