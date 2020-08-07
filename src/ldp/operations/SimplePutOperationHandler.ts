import { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';
import { ResourceStore } from '../../storage/ResourceStore';
import { ResponseDescription } from './ResponseDescription';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';

/**
 * Handles PUT {@link Operation}s.
 * Calls the setRepresentation function from a {@link ResourceStore}.
 */
export class SimplePutOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'PUT') {
      throw new UnsupportedHttpError('This handler only supports PUT operations.');
    }
    if (typeof input.body !== 'object') {
      throw new UnsupportedHttpError('PUT operations require a body.');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    await this.store.setRepresentation(input.target, input.body!);
    return { identifier: input.target };
  }
}
