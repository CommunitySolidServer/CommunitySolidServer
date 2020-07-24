import { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';
import { ResourceStore } from '../../storage/ResourceStore';
import { ResponseDescription } from './ResponseDescription';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';

/**
 * Handles POST {@link Operation}s.
 * Calls the addResource function from a {@link ResourceStore}.
 */
export class SimplePostOperationHandler extends OperationHandler {
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
    if (!input.body) {
      throw new UnsupportedHttpError('POST operations require a body.');
    }
    const identifier = await this.store.addResource(input.target, input.body);
    return { identifier };
  }
}
