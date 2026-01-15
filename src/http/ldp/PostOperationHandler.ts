import type { Term } from '@rdfjs/types';
import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { ForbiddenHttpError } from '../../util/errors/ForbiddenHttpError';
import { find } from '../../util/IterableUtil';
import { AS, LDP, RDF, SOLID_AS } from '../../util/Vocabularies';
import { CreatedResponseDescription } from '../output/response/CreatedResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import type { OperationHandlerInput } from './OperationHandler';
import { OperationHandler } from './OperationHandler';
import { ModerationMixin } from './ModerationMixin';
import type { ModerationConfig } from '../../moderation/ModerationConfig';

/**
 * Handles POST {@link Operation}s.
 * Calls the addResource function from a {@link ResourceStore}.
 */
export class PostOperationHandler extends OperationHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;
  private readonly moderationMixin: ModerationMixin | null;

  public constructor(store: ResourceStore, moderationConfig?: ModerationConfig) {
    super();
    this.store = store;
    try {
      this.moderationMixin = new ModerationMixin(moderationConfig);
    } catch (error) {
      this.logger.warn(`Failed to initialize moderation: ${(error as Error).message}`);
      this.moderationMixin = null;
    }
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'POST') {
      throw new NotImplementedHttpError('This handler only supports POST operations');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    const type = new Set(operation.body.metadata.getAll(RDF.terms.type).map((term: Term): string => term.value));
    const isContainerType = type.has(LDP.Container) || type.has(LDP.BasicContainer);
    // Solid, §2.1: "A Solid server MUST reject PUT, POST and PATCH requests
    // without the Content-Type header with a status code of 400."
    // https://solid.github.io/specification/protocol#http-server
    // An exception is made for LDP Containers as nothing is done with the body, so a Content-type is not required
    if (!operation.body.metadata.contentType && !isContainerType) {
      this.logger.warn('POST requests require the Content-Type header to be set');
      throw new BadRequestHttpError('POST requests require the Content-Type header to be set');
    }

    // Content moderation for POST uploads
    if (!isContainerType && operation.body?.data && this.moderationMixin) {
      this.logger.info(`MODERATION: Intercepting POST upload to ${operation.target.path}`);
      try {
        await this.moderationMixin.moderateContent(operation);
      } catch (error) {
        if (error instanceof ForbiddenHttpError) throw error;
        this.logger.warn(`MODERATION: POST analysis failed: ${(error as Error).message}`);
      }
    }

    const changes = await this.store.addResource(operation.target, operation.body, operation.conditions);
    const createdIdentifier = find(changes.keys(), (identifier): boolean =>
      Boolean(changes.get(identifier)?.has(SOLID_AS.terms.activity, AS.terms.Create)));
    if (!createdIdentifier) {
      throw new InternalServerError('Operation was successful but no created identifier was returned.');
    }
    return new CreatedResponseDescription(createdIdentifier);
  }
}
