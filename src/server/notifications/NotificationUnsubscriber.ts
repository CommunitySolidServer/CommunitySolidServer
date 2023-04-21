import { ResetResponseDescription } from '../../http/output/response/ResetResponseDescription';
import type { ResponseDescription } from '../../http/output/response/ResponseDescription';
import { getLoggerFor } from '../../logging/LogUtil';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { OperationHttpHandlerInput } from '../OperationHttpHandler';
import { OperationHttpHandler } from '../OperationHttpHandler';
import type { NotificationChannelStorage } from './NotificationChannelStorage';

/**
 * Allows clients to unsubscribe from notification channels.
 * Should be wrapped in a route handler that only allows `DELETE` operations.
 */
export class NotificationUnsubscriber extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: NotificationChannelStorage;

  public constructor(storage: NotificationChannelStorage) {
    super();
    this.storage = storage;
  }

  public async handle({ operation }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const id = operation.target.path;

    const existed = await this.storage.delete(id);
    if (!existed) {
      throw new NotFoundHttpError();
    }
    this.logger.debug(`Deleted notification channel ${id}`);

    return new ResetResponseDescription();
  }
}
