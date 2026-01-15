import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { CreatedResponseDescription } from '../output/response/CreatedResponseDescription';
import { ResetResponseDescription } from '../output/response/ResetResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import type { Patch } from '../representation/Patch';
import type { OperationHandlerInput } from './OperationHandler';
import { OperationHandler } from './OperationHandler';
import { ModerationMixin } from './ModerationMixin';
import type { ModerationConfig } from '../../moderation/ModerationConfig';

/**
 * Handles PATCH {@link Operation}s.
 * Calls the modifyResource function from a {@link ResourceStore}.
 */
export class PatchOperationHandler extends OperationHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;
  private readonly moderationMixin: ModerationMixin;

  public constructor(store: ResourceStore, moderationConfig?: ModerationConfig) {
    super();
    this.store = store;
    this.moderationMixin = new ModerationMixin(moderationConfig);
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

    // Content moderation for PATCH updates
    if (operation.body.data) {
      this.logger.info(`MODERATION: Intercepting PATCH update to ${operation.target.path}`);
      await this.moderationMixin.moderateContent(operation);
    }

    // RFC7231, §4.3.4: If the target resource does not have a current representation and the
    //   PUT successfully creates one, then the origin server MUST inform the
    //   user agent by sending a 201 (Created) response.
    const exists = await this.store.hasResource(operation.target);
    await this.store.modifyResource(operation.target, operation.body as Patch, operation.conditions);
    if (exists) {
      return new ResetResponseDescription();
    }
    return new CreatedResponseDescription(operation.target);
  }
}
