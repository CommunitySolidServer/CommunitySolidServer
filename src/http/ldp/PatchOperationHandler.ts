import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { AuxiliaryStrategy } from '../auxiliary/AuxiliaryStrategy';
import { CreatedResponseDescription } from '../output/response/CreatedResponseDescription';
import { ResetResponseDescription } from '../output/response/ResetResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import type { Patch } from '../representation/Patch';
import type { OperationHandlerInput } from './OperationHandler';
import { OperationHandler } from './OperationHandler';

/**
 * Handles PATCH {@link Operation}s.
 * Calls the modifyResource function from a {@link ResourceStore}.
 */
export class PatchOperationHandler extends OperationHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;
  private readonly metaStrategy: AuxiliaryStrategy;

  public constructor(store: ResourceStore, metaStrategy: AuxiliaryStrategy) {
    super();
    this.store = store;
    this.metaStrategy = metaStrategy;
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'PATCH') {
      throw new NotImplementedHttpError('This handler only supports PATCH operations.');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    // Solid, §2.1: "A Solid server MUST reject PUT, POST and PATCH requests
    // without the Content-Type header with a status code of 400."
    // https://solid.github.io/specification/protocol#http-server
    if (!operation.body.metadata.contentType) {
      this.logger.warn('PATCH requests require the Content-Type header to be set');
      throw new BadRequestHttpError('PATCH requests require the Content-Type header to be set');
    }
    const exists = await this.store.resourceExists(operation.target, operation.conditions);

    if (this.metaStrategy.isAuxiliaryIdentifier(operation.target)) {
      const subjectIdentifier = this.metaStrategy.getSubjectIdentifier(operation.target);

      // Cannot create metadata without a corresponding resource
      if (!exists) {
        throw new ConflictHttpError('Metadata resources can not be created directly.');
      }

      // https://github.com/solid/community-server/issues/1027#issuecomment-988664970
      // It must not be possible to create .meta.meta resources
      if (this.metaStrategy.isAuxiliaryIdentifier(subjectIdentifier)) {
        throw new ConflictHttpError(
          'Not allowed to create metadata resources on a metadata resource.',
        );
      }
    }

    // A more efficient approach would be to have the server return metadata indicating if a resource was new
    // See https://github.com/solid/community-server/issues/632
    // RFC7231, §4.3.4: If the target resource does not have a current representation and the
    //   PUT successfully creates one, then the origin server MUST inform the
    //   user agent by sending a 201 (Created) response.
    await this.store.modifyResource(operation.target, operation.body as Patch, operation.conditions);
    if (exists) {
      return new ResetResponseDescription();
    }
    return new CreatedResponseDescription(operation.target);
  }
}
