import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { isContainerPath } from '../../util/PathUtil';
import type { AuxiliaryStrategy } from '../auxiliary/AuxiliaryStrategy';
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
  private readonly metadataStrategy: AuxiliaryStrategy;

  public constructor(store: ResourceStore, metadataStrategy: AuxiliaryStrategy) {
    super();
    this.store = store;
    this.metadataStrategy = metadataStrategy;
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'PUT') {
      throw new NotImplementedHttpError('This handler only supports PUT operations');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    const targetIsContainer = isContainerPath(operation.target.path);

    // Solid, §2.1: "A Solid server MUST reject PUT, POST and PATCH requests
    // without the Content-Type header with a status code of 400."
    // https://solid.github.io/specification/protocol#http-server
    // An exception is made for LDP Containers as nothing is done with the body, so a Content-type is not required
    if (!operation.body.metadata.contentType && !targetIsContainer) {
      this.logger.warn('PUT requests require the Content-Type header to be set');
      throw new BadRequestHttpError('PUT requests require the Content-Type header to be set');
    }

    // https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1027#issuecomment-988664970
    // We do not allow PUT on metadata resources for simplicity.
    // Otherwise, all generated metadata triples would have to be identical, such as date modified.
    // We already reject the request here instead of `setRepresentation` so PATCH requests
    // can still use that function to update data.
    if (this.metadataStrategy.isAuxiliaryIdentifier(operation.target)) {
      throw new MethodNotAllowedHttpError(
        [ 'PUT' ],
        'Not allowed to create or edit metadata resources using PUT; use PATCH instead.',
      );
    }

    // A more efficient approach would be to have the server return metadata indicating if a resource was new
    // See https://github.com/CommunitySolidServer/CommunitySolidServer/issues/632
    const exists = await this.store.hasResource(operation.target);
    await this.store.setRepresentation(operation.target, operation.body, operation.conditions);
    if (exists) {
      return new ResetResponseDescription();
    }
    return new CreatedResponseDescription(operation.target);
  }
}
