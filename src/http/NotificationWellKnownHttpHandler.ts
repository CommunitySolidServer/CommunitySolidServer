import { Readable } from 'stream';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import { getLoggerFor } from '../logging/LogUtil';
import { OperationHttpHandler } from '../server/OperationHttpHandler';
import type { OperationHttpHandlerInput } from '../server/OperationHttpHandler';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { guardStream } from '../util/GuardedStream';
import type { OperationHandlerInput } from './ldp/OperationHandler';
import { OkResponseDescription } from './output/response/OkResponseDescription';
import { RepresentationMetadata } from './representation/RepresentationMetadata';

export interface NotificationWellKnownHttpHandlerArgs {
  /**
     * Base URL of the gateway.
     */
  baseUrl: string;
}

/**
 * Handles the negotiation of notification channels
 */
export class NotificationWellKnownHttpHandler extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly json: object;

  public constructor(args: NotificationWellKnownHttpHandlerArgs) {
    super();
    this.json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      /* eslint-disable @typescript-eslint/naming-convention */
      notification_endpoint: `${args.baseUrl}gateway`,
    };
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'GET') {
      throw new NotImplementedHttpError('This handler only supports GET operations');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription | undefined> {
    const representationMetadata = new RepresentationMetadata('application/ld+json');
    const data = guardStream(Readable.from(JSON.stringify(this.json)));
    return new OkResponseDescription(representationMetadata, data);
  }
}
