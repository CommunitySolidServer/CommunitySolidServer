import type { EventEmitter } from 'events';
import type { CredentialsExtractor } from '../../authentication/CredentialsExtractor';
import type { PermissionReader } from '../../authorization/PermissionReader';
import { AccessMode } from '../../authorization/permissions/Permissions';
import type { PermissionMap } from '../../authorization/permissions/Permissions';
import type { OperationHandlerInput } from '../../http/ldp/OperationHandler';
import { OkResponseDescription } from '../../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../../http/output/response/ResponseDescription';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { getLoggerFor } from '../../logging/LogUtil';
import type { Subscription } from '../../notification/Subscription';
import type { SubscriptionHandler } from '../../notification/SubscriptionHandler';
import type { Topic } from '../../notification/Topic';
import { OperationHttpHandler } from '../../server/OperationHttpHandler';
import type { OperationHttpHandlerInput } from '../../server/OperationHttpHandler';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { ReadWriteLocker } from '../../util/locking/ReadWriteLocker';
import { IdentifierSetMultiMap } from '../../util/map/IdentifierMap';
import { AS } from '../../util/Vocabularies';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';

/**
 * Handles the negotiation of notification channels
 */
export class NotificationSubscriptionHttpHandler extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);
  private readonly ignoreFolders: RegExp[];
  private readonly subscriptionHandlers: Map<string, SubscriptionHandler<Subscription>> = new Map();
  private readonly base: string;

  public constructor(
    private readonly credentialsExtractor: CredentialsExtractor,
    private readonly permissionReader: PermissionReader,
    private readonly notificationStorage: KeyValueStorage<string, Topic>,
    private readonly source: EventEmitter,
    private readonly locker: ReadWriteLocker,
    subscriptionHandlers: SubscriptionHandler<Subscription>[],
    base: string,
    ignoreFolders?: string[],
  ) {
    super();
    this.base = base;
    this.ignoreFolders = ignoreFolders ? ignoreFolders.map((folder: string): RegExp => new RegExp(folder, 'u')) : [];
    for (const handler of subscriptionHandlers) {
      this.subscriptionHandlers.set(handler.getType(), handler);
    }
    this.source.on(AS.Create, async(id: ResourceIdentifier): Promise<void> => this.onResourceChanged(id, AS.Create));
    this.source.on(AS.Update, async(id: ResourceIdentifier): Promise<void> => this.onResourceChanged(id, AS.Update));
    this.source.on(AS.Delete, async(id: ResourceIdentifier): Promise<void> => this.onResourceChanged(id, AS.Delete));
  }

  public getSupportedTypes(): string[] {
    return [ ...this.subscriptionHandlers.keys() ];
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'POST') {
      throw new NotImplementedHttpError('This handler only supports POST operations');
    }
  }

  public async handle({ request }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const body = await request.read();
    if (!body) {
      throw new BadRequestHttpError('A body should be provided');
    }
    const subscriptionRequest = JSON.parse(body.toString());
    if (!subscriptionRequest.topic || !subscriptionRequest.target) {
      throw new BadRequestHttpError('A `topic` and `target` should be provided in the body');
    }
    const subscriptionType: string = subscriptionRequest.type;

    // Check if the requested subscription type is supported/available
    const subscriptionHandler = this.subscriptionHandlers.get(subscriptionType);
    if (!subscriptionHandler) {
      throw new BadRequestHttpError(
        `Subscription type "${subscriptionType}" not supported`,
      );
    }

    // Check permissions for the topic
    const topicURI: string = subscriptionRequest.topic;
    const credentials = await this.credentialsExtractor.handleSafe(request);
    if (!credentials.agent?.webId) {
      throw new BadRequestHttpError('No WebId present in request');
    }
    const topicIdentifier = { path: topicURI };
    const permissionMap: PermissionMap = await this.permissionReader.handleSafe({
      credentials,
      requestedModes: new IdentifierSetMultiMap<AccessMode>([
        [ topicIdentifier, AccessMode.read ],
      ]),
    });
    const permissionSet = permissionMap.get(topicIdentifier);
    if (!permissionSet?.public?.read && !permissionSet?.agent?.read) {
      throw new BadRequestHttpError('Agent not allowed to read resource.');
    }

    const encodedTopicUri = encodeURIComponent(topicURI);
    // Create the subscription object
    const subscription: Subscription = subscriptionHandler.subscribe(subscriptionRequest);

    // These operations (.get() and .set()) are done with a WriteLock to prevent race conditions
    await this.locker.withWriteLock({ path: encodedTopicUri }, async(): Promise<void> => {
      const existingTopic = await this.notificationStorage.get(encodedTopicUri);
      const topic: Topic = existingTopic ?? { subscriptions: {}};
      // Save the new subscription
      topic.subscriptions[credentials.agent!.webId!] = subscription;
      await this.notificationStorage.set(encodedTopicUri, topic);
    });

    this.logger.verbose(
      `Registered subscription[${subscriptionType}] at topic[${topicURI}] for agent[${credentials.agent.webId}]`,
    );

    const representationMetadata = new RepresentationMetadata('application/ld+json');
    return new OkResponseDescription(
      representationMetadata,
      subscriptionHandler.getResponseData(subscription),
    );
  }

  private async onResourceChanged(
    resource: ResourceIdentifier,
    activity: string,
  ): Promise<void> {
    if (!this.ignoreFolders.some((folder: RegExp): boolean =>
      folder.test(resource.path.slice(this.base.length)))) {
      const notifyResources = [
        resource,
        { path: resource.path.slice(0, resource.path.replace(/\/$/u, '').lastIndexOf('/') + 1) },
      ];
      for (const res of notifyResources) {
        const topic = await this.notificationStorage.get(encodeURIComponent(res.path));
        if (topic?.subscriptions) {
          for (const [ , subscription ] of Object.entries(topic.subscriptions)) {
            const subscriptionHandler = this.subscriptionHandlers.get(subscription.type);
            if (subscriptionHandler) {
              await subscriptionHandler.onChange(resource, activity, subscription);
            }
          }
        }
      }
    }
  }
}
