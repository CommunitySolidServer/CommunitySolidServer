import type { CredentialSet } from '../../authentication/Credentials';
import type { CredentialsExtractor } from '../../authentication/CredentialsExtractor';
import type { Subscription } from '../../notification/Subscription';
import type { Topic } from '../../notification/Topic';
import type {
  WebHookSubscription2021,
} from '../../notification/webhook-subscription-2021/WebHookSubscription2021Handler';
import type { OperationHttpHandlerInput } from '../../server/OperationHttpHandler';
import { OperationHttpHandler } from '../../server/OperationHttpHandler';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { OperationHandlerInput } from '../ldp/OperationHandler';
import { OkResponseDescription } from '../output/response/OkResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';

export class WebHookSubscription2021UnsubscribeHttpHandler extends OperationHttpHandler {
  public constructor(
    private readonly baseUrl: string,
    private readonly credentialsExtractor: CredentialsExtractor,
    private readonly notificationStorage: KeyValueStorage<string, Topic>,
  ) {
    super();
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'DELETE') {
      throw new NotImplementedHttpError('This handler only supports DELETE operations');
    }
  }

  public async handle({ request }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    // Extract WebId Credential
    const credentials: CredentialSet = await this.credentialsExtractor.handleSafe(request);
    const webid = credentials.agent?.webId;
    if (!webid) {
      throw new BadRequestHttpError('No WebId present in request');
    }

    // Get the subscription id
    if (!request.url) {
      throw new BadRequestHttpError('No url present in request');
    }
    const splitUrl = request.url.split('/');
    const subscriptionId = splitUrl[splitUrl.length - 1];
    // The id should contain the encoded baseurl, 3x ~ and some more characters.
    // This check will NOT guarantee that the id is valid but invalid ids getting through this will
    // result in a BadRequestHttpError down the line.
    // This check mainly exists to provide a better error message to the user.
    const match = new RegExp(`(${encodeURIComponent(this.baseUrl)}.+?)~~~.+`, 'u').exec(subscriptionId);
    if (!match || !match[1]) {
      throw new BadRequestHttpError('Invalid subscription id');
    }
    const subscriptionTarget = decodeURIComponent(match[1]);

    // Get topic from the store
    const topic = await this.notificationStorage.get(encodeURIComponent(subscriptionTarget));
    const subscription = topic?.subscriptions?.[webid] as WebHookSubscription2021;
    if (!topic || !subscription) {
      throw new BadRequestHttpError('Subscription does not exist');
    }

    const newSubs: Record<string, Subscription> = {};
    for (const [ key, value ] of Object.entries(topic.subscriptions)) {
      if (key !== webid && (value as any)?.id !== subscription.id) {
        newSubs[key] = value;
      }
    }
    await this.notificationStorage.set(encodeURIComponent(subscriptionTarget), { subscriptions: newSubs });

    return new OkResponseDescription(
      new RepresentationMetadata('application/ld+json'),
    );
  }
}
