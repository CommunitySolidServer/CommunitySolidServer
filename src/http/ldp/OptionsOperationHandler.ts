import type { ResourceSet } from '../../storage/ResourceSet';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { NoContentResponseDescription } from '../output/response/NoContentResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import type { OperationHandlerInput } from './OperationHandler';
import { OperationHandler } from './OperationHandler';

/**
 * Handles OPTIONS {@link Operation}s by always returning a 204.
 */
export class OptionsOperationHandler extends OperationHandler {
  private readonly resourceSet: ResourceSet;

  /**
   * Uses a {@link ResourceSet} to determine the existence of the target resource which impacts the response code.
   * @param resourceSet - {@link ResourceSet} that knows if the target resource exists or not.
   */
  public constructor(resourceSet: ResourceSet) {
    super();
    this.resourceSet = resourceSet;
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'OPTIONS') {
      throw new NotImplementedHttpError('This handler only supports OPTIONS operations');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    if (!await this.resourceSet.hasResource(operation.target)) {
      throw new NotFoundHttpError();
    }
    return new NoContentResponseDescription();
  }
}
