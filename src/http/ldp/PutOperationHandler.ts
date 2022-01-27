import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { ComposedAuxiliaryStrategy } from '../auxiliary/ComposedAuxiliaryStrategy';
import { CreatedResponseDescription } from '../output/response/CreatedResponseDescription';
import { ResetResponseDescription } from '../output/response/ResetResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import type { OperationHandlerInput } from './OperationHandler';
import { OperationHandler } from './OperationHandler';

/**
 * Handles PUT {@link Operation}s.
 * Calls the setRepresentation function from a {@link ResourceStore}.
 */
export class PutOperationHandler extends OperationHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;
  private readonly metaStrategy: ComposedAuxiliaryStrategy;

  public constructor(store: ResourceStore, metaStrategy: ComposedAuxiliaryStrategy) {
    super();
    this.store = store;
    this.metaStrategy = metaStrategy;
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'PUT') {
      throw new NotImplementedHttpError('This handler only supports PUT operations');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    // Solid, §2.1: "A Solid server MUST reject PUT, POST and PATCH requests
    // without the Content-Type header with a status code of 400."
    // https://solid.github.io/specification/protocol#http-server
    if (!operation.body.metadata.contentType) {
      this.logger.warn('PUT requests require the Content-Type header to be set');
      throw new BadRequestHttpError('PUT requests require the Content-Type header to be set');
    }

    // https://github.com/solid/community-server/issues/1027#issuecomment-988664970
    // PUT is not allowed on metadata
    if (this.metaStrategy.isAuxiliaryIdentifier(operation.target)) {
      throw new ConflictHttpError('Not allowed to create or edit files with the metadata extension using PUT.');
    }

    // A more efficient approach would be to have the server return metadata indicating if a resource was new
    // See https://github.com/solid/community-server/issues/632
    const exists = await this.store.resourceExists(operation.target, operation.conditions);
    await this.store.setRepresentation(operation.target, operation.body, operation.conditions);
    if (exists) {
      return new ResetResponseDescription();
    }
    return new CreatedResponseDescription(operation.target);
  }
}
