import type { CredentialSet } from '../authentication/Credentials';
import type { CredentialsExtractor } from '../authentication/CredentialsExtractor';
import { OkResponseDescription } from '../http/output/response/OkResponseDescription';
import { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
import type { WebHookSubscription2021 } from '../notification/webhook-subscription-2021/WebHookSubscription2021Handler';
import type { OperationHttpHandlerInput } from '../server/OperationHttpHandler';
import { OperationHttpHandler } from '../server/OperationHttpHandler';
import type { KeyValueStorage } from '../storage/keyvalue/KeyValueStorage';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import type { Topic } from './NotificationSubscriptionHttpHandler';
import type { ResponseDescription } from './output/response/ResponseDescription';

export interface WebHookSubscription2021UnsubscribeHttpHandlerArgs {
  baseUrl: string;
  credentialsExtractor: CredentialsExtractor;
  notificationStorage: KeyValueStorage<string, Topic>;
}

export class WebHookSubscription2021UnsubscribeHttpHandler extends OperationHttpHandler {
  private readonly baseUrl: string;
  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly notificationStorage: KeyValueStorage<string, Topic>;

  public constructor(args: WebHookSubscription2021UnsubscribeHttpHandlerArgs) {
    super();
    this.baseUrl = args.baseUrl;
    this.credentialsExtractor = args.credentialsExtractor;
    this.notificationStorage = args.notificationStorage;
  }

  public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription | undefined> {
    const { request } = input;

    // Extract WebId Credential
    const credentials: CredentialSet =
      await this.credentialsExtractor.handleSafe(request);
    if (!credentials.agent?.webId) {
      throw new BadRequestHttpError('No WebId present in request');
    }
    const { webId } = credentials.agent;

    // Get the subscription id
    if (!request.url) {
      throw new BadRequestHttpError('No url present in request');
    }
    const splitUrl = request.url.split('/');
    const subscriptionId = splitUrl[splitUrl.length - 1];
    const subscriptionTargetFromId = decodeURIComponent(subscriptionId.split('~~~')[0]);

    // Get the current notification data
    const notificationData = await this.notificationStorage.get(subscriptionTargetFromId);
    if (
      !(notificationData?.subscriptions[webId] &&
      (notificationData.subscriptions[webId] as WebHookSubscription2021).id === subscriptionId)
    ) {
      throw new BadRequestHttpError('Subscription does not exist');
    }
    // This rules says that we're using the wrong data structure. I agree, I will bring
    // this up in the next meeting - Jackson
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete notificationData.subscriptions[webId];

    await this.notificationStorage.set(subscriptionTargetFromId, notificationData);

    // Return Response
    const representationMetadata = new RepresentationMetadata(
      'application/ld+json',
    );
    return new OkResponseDescription(
      representationMetadata,
    );
  }
}
