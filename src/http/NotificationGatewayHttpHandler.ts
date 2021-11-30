import { Readable } from 'stream';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import { getLoggerFor } from '../logging/LogUtil';
import { OperationHttpHandler } from '../server/OperationHttpHandler';
import type { OperationHttpHandlerInput } from '../server/OperationHttpHandler';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { guardStream } from '../util/GuardedStream';
import { joinUrl, trimTrailingSlashes } from '../util/PathUtil';
import type { OperationHandlerInput } from './ldp/OperationHandler';
import type { NotificationSubscriptionHttpHandler } from './NotificationSubscriptionHttpHandler';
import { OkResponseDescription } from './output/response/OkResponseDescription';
import { RepresentationMetadata } from './representation/RepresentationMetadata';

export interface NotificationGatewayHttpHandlerArgs {
  /**
   * Base URL of the gateway.
   */
  baseUrl: string;
  /**
   * Relative path of the IDP entry point.
   */
  subscriptionPath: string;
  /**
    * The notification handler.
    */
  subscriptionHandler: NotificationSubscriptionHttpHandler;
}

/**
 * Handles the negotiation of notification channels
 */
export class NotificationGatewayHttpHandler extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly subscriptionHandler: NotificationSubscriptionHttpHandler;
  private readonly subscriptionEndpoint: string;
  private readonly supportedTypes: string[];

  public constructor(args: NotificationGatewayHttpHandlerArgs) {
    super();
    // Trimming trailing slashes so the relative URL starts with a slash after slicing this off
    this.subscriptionEndpoint = trimTrailingSlashes(joinUrl(args.baseUrl, args.subscriptionPath));
    this.subscriptionHandler = args.subscriptionHandler;
    this.supportedTypes = this.subscriptionHandler.getSupportedTypes();
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'POST') {
      throw new NotImplementedHttpError('This handler only supports POST operations');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle({ operation, request }: OperationHttpHandlerInput): Promise<ResponseDescription | undefined> {
    const body = await request.read();
    const json = JSON.parse(body.toString());
    const requestedTypes: string[] = json.type;
    const matches = requestedTypes.filter((type): boolean => this.supportedTypes.includes(type));
    if (matches.length === 0) {
      throw new NotImplementedHttpError(`This gateway only supports ${this.supportedTypes} notifications`);
    }
    const responseJson = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: matches[0],
      endpoint: this.subscriptionEndpoint,
      features: [],
    };
    const representationMetadata = new RepresentationMetadata('application/ld+json');
    const data = guardStream(Readable.from(JSON.stringify(responseJson)));
    return new OkResponseDescription(representationMetadata, data);
  }
}
