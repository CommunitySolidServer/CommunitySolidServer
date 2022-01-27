import type { ResourceStore } from '../../storage/ResourceStore';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { ComposedAuxiliaryStrategy } from '../auxiliary/ComposedAuxiliaryStrategy';
import { ResetResponseDescription } from '../output/response/ResetResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import type { OperationHandlerInput } from './OperationHandler';
import { OperationHandler } from './OperationHandler';

/**
 * Handles DELETE {@link Operation}s.
 * Calls the deleteResource function from a {@link ResourceStore}.
 */
export class DeleteOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;
  private readonly metaStrategy: ComposedAuxiliaryStrategy;

  public constructor(store: ResourceStore, metaStrategy: ComposedAuxiliaryStrategy) {
    super();
    this.store = store;
    this.metaStrategy = metaStrategy;
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'DELETE') {
      throw new NotImplementedHttpError('This handler only supports DELETE operations');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    // https://github.com/solid/community-server/issues/1027#issuecomment-988664970
    // DELETE is not allowed on metadata
    if (this.metaStrategy.isAuxiliaryIdentifier(operation.target)) {
      throw new ConflictHttpError('Not allowed to delete files with the metadata extension.');
    }

    await this.store.deleteResource(operation.target, operation.conditions);
    return new ResetResponseDescription();
  }
}
