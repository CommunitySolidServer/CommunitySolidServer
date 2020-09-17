import type { ResourceStore } from '../../storage/ResourceStore';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import type { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';
import type { ResponseDescription } from './ResponseDescription';

/**
 * Handles POST {@link Operation}s.
 * Calls the addResource function from a {@link ResourceStore}.
 */
export class PostOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'POST') {
      throw new UnsupportedHttpError('This handler only supports POST operations.');
    }
    if (!input.body) {
      throw new UnsupportedHttpError('POST operations require a body.');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    const identifier = await this.store.addResource(input.target, input.body!);
    return { identifier };
  }
}
