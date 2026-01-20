import { getLoggerFor } from '../../logging/LogUtil';
import type { ModerationConfig } from '../../moderation/ModerationConfig';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import type { OperationHandlerInput } from './OperationHandler';
import { OperationHandler } from './OperationHandler';
import { ModerationMixin } from './ModerationMixin';

/**
 * Wraps an OperationHandler to add content moderation for operations with body data.
 * Checks PUT, POST, and PATCH operations before passing them to the wrapped handler.
 */
export class ModerationOperationHandler extends OperationHandler {
  protected readonly logger = getLoggerFor(this);
  private readonly source: OperationHandler;
  private readonly moderationMixin: ModerationMixin;

  public constructor(source: OperationHandler, moderationConfig?: ModerationConfig) {
    super();
    this.source = source;
    this.moderationMixin = new ModerationMixin(moderationConfig);
  }

  public async canHandle(input: OperationHandlerInput): Promise<void> {
    return this.source.canHandle(input);
  }

  public async handle(input: OperationHandlerInput): Promise<ResponseDescription> {
    const { operation } = input;

    // Only moderate operations with body data
    if (operation.body?.data && [ 'PUT', 'POST', 'PATCH' ].includes(operation.method)) {
      await this.moderationMixin.moderateContent(operation);
    }

    return this.source.handle(input);
  }
}
