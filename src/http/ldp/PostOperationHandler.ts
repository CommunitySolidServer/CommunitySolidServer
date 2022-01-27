import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { SOLID_HTTP } from '../../util/Vocabularies';
import type { ComposedAuxiliaryStrategy } from '../auxiliary/ComposedAuxiliaryStrategy';
import { CreatedResponseDescription } from '../output/response/CreatedResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import type { OperationHandlerInput } from './OperationHandler';
import { OperationHandler } from './OperationHandler';

/**
 * Handles POST {@link Operation}s.
 * Calls the addResource function from a {@link ResourceStore}.
 */
export class PostOperationHandler extends OperationHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;
  private readonly metaStrategy: ComposedAuxiliaryStrategy;

  public constructor(store: ResourceStore, metaStrategy: ComposedAuxiliaryStrategy) {
    super();
    this.store = store;
    this.metaStrategy = metaStrategy;
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'POST') {
      throw new NotImplementedHttpError('This handler only supports POST operations');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    // Solid, §2.1: "A Solid server MUST reject PUT, POST and PATCH requests
    // without the Content-Type header with a status code of 400."
    // https://solid.github.io/specification/protocol#http-server
    if (!operation.body.metadata.contentType) {
      this.logger.warn('POST requests require the Content-Type header to be set');
      throw new BadRequestHttpError('POST requests require the Content-Type header to be set');
    }
    // https://github.com/solid/community-server/issues/1027#issuecomment-988664970
    // POST is not allowed on metadata
    if (operation.body.metadata.get(SOLID_HTTP.slug)) {
      const slug = operation.body.metadata.get(SOLID_HTTP.slug)!.value;
      if (this.metaStrategy.isAuxiliaryIdentifier({ path: slug })) {
        throw new ConflictHttpError('Not allowed to create files with the metadata extension using POST.');
      }
    }
    const identifier = await this.store.addResource(operation.target, operation.body, operation.conditions);
    return new CreatedResponseDescription(identifier);
  }
}
