import type { ResourceStore } from '../../storage/ResourceStore';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { ResetResponseDescription } from '../http/response/ResetResponseDescription';
import type { ResponseDescription } from '../http/response/ResponseDescription';
import type { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';

/**
 * Handles DELETE {@link Operation}s.
 * Calls the deleteResource function from a {@link ResourceStore}.
 */
export class DeleteOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'DELETE') {
      throw new NotImplementedHttpError('This handler only supports DELETE operations');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    await this.store.deleteResource(input.target, input.conditions);
    return new ResetResponseDescription();
  }
}
