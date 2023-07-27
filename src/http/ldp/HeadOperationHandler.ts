import type { ETagHandler } from '../../storage/conditions/ETagHandler';
import type { ResourceStore } from '../../storage/ResourceStore';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { assertReadConditions } from '../../util/ResourceUtil';
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
  private readonly eTagHandler: ETagHandler;

  public constructor(store: ResourceStore, eTagHandler: ETagHandler) {
    super();
    this.store = store;
    this.eTagHandler = eTagHandler;
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'HEAD') {
      throw new NotImplementedHttpError('This handler only supports HEAD operations');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    const body = await this.store.getRepresentation(operation.target, operation.preferences, operation.conditions);

    // Check whether the cached representation is still valid or it is necessary to send a new representation.
    // Generally it doesn't make much sense to use condition headers with a HEAD request, but it should be supported.
    assertReadConditions(body, this.eTagHandler, operation.conditions);

    // Close the Readable as we will not return it.
    body.data.destroy();

    return new OkResponseDescription(body.metadata);
  }
}
