import type { CredentialsExtractor } from '../../../authentication/CredentialsExtractor';
import { ResetResponseDescription } from '../../../http/output/response/ResetResponseDescription';
import type { ResponseDescription } from '../../../http/output/response/ResponseDescription';
import { getLoggerFor } from '../../../logging/LogUtil';
import { ForbiddenHttpError } from '../../../util/errors/ForbiddenHttpError';
import { NotFoundHttpError } from '../../../util/errors/NotFoundHttpError';
import type { OperationHttpHandlerInput } from '../../OperationHttpHandler';
import { OperationHttpHandler } from '../../OperationHttpHandler';
import type { NotificationChannelStorage } from '../NotificationChannelStorage';
import { parseWebHookUnsubscribeUrl } from './WebHook2021Util';
import type { WebHookFeatures } from './WebHookSubscription2021';

/**
 * Allows clients to unsubscribe from a WebHookSubscription2021.
 * Should be wrapped in a route handler that only allows `DELETE` operations.
 */
export class WebHookUnsubscriber extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly storage: NotificationChannelStorage<WebHookFeatures>;

  public constructor(credentialsExtractor: CredentialsExtractor, storage: NotificationChannelStorage<WebHookFeatures>) {
    super();
    this.credentialsExtractor = credentialsExtractor;
    this.storage = storage;
  }

  public async handle({ operation, request }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const id = parseWebHookUnsubscribeUrl(operation.target.path);
    const channel = await this.storage.get(id);
    if (!channel) {
      throw new NotFoundHttpError();
    }

    const credentials = await this.credentialsExtractor.handleSafe(request);
    if (channel.features.webId !== credentials.agent?.webId) {
      throw new ForbiddenHttpError();
    }

    this.logger.debug(`Deleting WebHook notification channel ${id}`);
    await this.storage.delete(id);

    return new ResetResponseDescription();
  }
}
