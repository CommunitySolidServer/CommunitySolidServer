import { Readable } from 'stream';
import { getLoggerFor } from '../../logging/LogUtil';
import { OperationHttpHandler } from '../../server/OperationHttpHandler';
import type { OperationHttpHandlerInput } from '../../server/OperationHttpHandler';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { guardStream } from '../../util/GuardedStream';
import { joinUrl, trimTrailingSlashes } from '../../util/PathUtil';
import type { OperationHandlerInput } from '../ldp/OperationHandler';
import { OkResponseDescription } from '../output/response/OkResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { NotificationSubscriptionHttpHandler } from './NotificationSubscriptionHttpHandler';

/**
 * Handles the negotiation of notification channels
 */
export class NotificationGatewayHttpHandler extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly subscriptionEndpoint: string;
  private readonly supportedTypes: string[];

  public constructor(
    private readonly subscriptionHandler: NotificationSubscriptionHttpHandler,
    baseUrl: string,
    subscriptionPath: string,
  ) {
    super();
    // Trimming trailing slashes so the relative URL starts with a slash after slicing this off
    this.subscriptionEndpoint = trimTrailingSlashes(joinUrl(baseUrl, subscriptionPath));
    this.supportedTypes = this.subscriptionHandler.getSupportedTypes();
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'POST') {
      throw new NotImplementedHttpError('This handler only supports POST operations');
    }
  }

  public async handle({ request }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const body = await request.read() ?? '';
    const json = JSON.parse(body.toString());
    const requestedTypes: string[] = json.type;
    if (!body || !Array.isArray(requestedTypes)) {
      throw new BadRequestHttpError('A body should be provided containing a `type` field in the form of an array');
    }
    const matches = requestedTypes.filter((type): boolean => this.supportedTypes.includes(type));
    if (matches.length === 0) {
      throw new NotImplementedHttpError(`This gateway only supports [ ${this.supportedTypes} ] notifications`);
    }
    const responseJson = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      notificationChannel: matches.map((match): Record<string, any> => ({
        type: match,
        endpoint: this.subscriptionEndpoint,
        features: [],
      })),
    };
    const representationMetadata = new RepresentationMetadata('application/ld+json');
    const data = guardStream(Readable.from(JSON.stringify(responseJson)));
    return new OkResponseDescription(representationMetadata, data);
  }
}
