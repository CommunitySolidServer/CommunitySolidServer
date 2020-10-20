import { getLoggerFor } from '../../logging/LogUtil';
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
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'POST') {
      this.logger.warn('This handler only supports POST operations.');
      throw new UnsupportedHttpError('This handler only supports POST operations.');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    if (!input.body) {
      this.logger.warn('POST operations require a body.');
      throw new UnsupportedHttpError('POST operations require a body.');
    }
    const identifier = await this.store.addResource(input.target, input.body);
    return { identifier };
  }
}
