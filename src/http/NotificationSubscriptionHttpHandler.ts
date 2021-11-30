import type { EventEmitter } from 'events';
import type { CredentialSet } from '../authentication/Credentials';
import type { CredentialsExtractor } from '../authentication/CredentialsExtractor';
import type { PermissionReader, PermissionReaderInput } from '../authorization/PermissionReader';
import type { PermissionSet } from '../authorization/permissions/Permissions';
import type { OperationHandlerInput } from '../http/ldp/OperationHandler';
import { OkResponseDescription } from '../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
import { getLoggerFor } from '../logging/LogUtil';
import type { Subscription, SubscriptionHandler } from '../notification/SubscriptionHandler';
import { OperationHttpHandler } from '../server/OperationHttpHandler';
import type { OperationHttpHandlerInput } from '../server/OperationHttpHandler';
import type { KeyValueStorage } from '../storage/keyvalue/KeyValueStorage';
import type { ModifiedResource } from '../storage/ResourceStore';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';

export interface NotificationSubscriptionHttpHandlerArgs {
  /**
   * Base URL of the gateway.
   */
  baseUrl: string;
  /**
   * Relative path of the IDP entry point.
   */
  wsEndpoint: string;
  /**
   * Extracts the credentials from the incoming request.
   */
  credentialsExtractor: CredentialsExtractor;
  /**
   * Reads the permissions available for the Operation.
   */
  permissionReader: PermissionReader;
  /**
   * The storage where notification metadata will be stored.
   */
  notificationStorage: KeyValueStorage<string, Topic>;
  /**
   * The configured subscription handlers
   */
  handlers: SubscriptionHandler[];
  /**
   * The resource store to monitor for changes
   */
  source: EventEmitter;
}

export interface Topic {
  subscriptions: Record<string, Subscription>;
}

/**
 * Handles the negotiation of notification channels
 */
export class NotificationSubscriptionHttpHandler extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly permissionReader: PermissionReader;
  private readonly notificationStorage: KeyValueStorage<string, Topic>;
  private readonly subscriptionHandlers: Map<string, SubscriptionHandler> =
  new Map();

  private readonly source: EventEmitter;

  public constructor(args: NotificationSubscriptionHttpHandlerArgs) {
    super();
    this.credentialsExtractor = args.credentialsExtractor;
    this.permissionReader = args.permissionReader;
    // Trimming trailing slashes so the relative URL starts with a slash after slicing this off
    this.notificationStorage = args.notificationStorage;
    args.handlers.forEach((handler): void => {
      this.subscriptionHandlers.set(handler.getType(), handler);
    });
    this.source = args.source;
    this.source.on('changed', async(changed: ModifiedResource[]): Promise<void> => this.onResourceChanged(changed));
  }

  public getSupportedTypes(): string[] {
    return [ ...this.subscriptionHandlers.keys() ];
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'POST') {
      throw new NotImplementedHttpError('This handler only supports POST operations');
    }
  }

  public async handle(
    input: OperationHttpHandlerInput,
  ): Promise<ResponseDescription | undefined> {
    const { request } = input;

    const body = await request.read();
    const subscriptionRequest = JSON.parse(body.toString());
    const subscriptionType: string = subscriptionRequest.type;

    const subscriptionHandler = this.subscriptionHandlers.get(subscriptionType);
    if (!subscriptionHandler) {
      throw new BadRequestHttpError(`Subscription type ${subscriptionType} not supported`);
    }
    const topicURI: string = subscriptionRequest.topic;

    const credentials: CredentialSet = await this.credentialsExtractor.handleSafe(request);
    if (!credentials.agent?.webId) {
      throw new BadRequestHttpError('No WebId present in request');
    }

    const permissionReaderInput: PermissionReaderInput = {
      credentials,
      identifier: { path: topicURI },
    };

    const permissionSet: PermissionSet = await this.permissionReader.handleSafe(permissionReaderInput);
    if (!permissionSet.public?.read && !permissionSet.agent?.read) {
      throw new BadRequestHttpError('Agent not allowed to read resource.');
    }

    let topic = await this.notificationStorage.get(topicURI);

    if (!topic) {
      topic = { subscriptions: {}};
    }

    const { subscriptions } = topic;
    const subscription: Subscription = subscriptionHandler.subscribe(subscriptionRequest);
    subscriptions[credentials.agent.webId] = subscription;

    await this.notificationStorage.set(topicURI, topic);

    this.logger.verbose(
      `Registered subscription[${subscriptionType}] at topic[${topicURI}] for agent[${credentials.agent.webId}]`,
    );

    const representationMetadata = new RepresentationMetadata(
      'application/ld+json',
    );
    return new OkResponseDescription(
      representationMetadata,
      subscriptionHandler.getResponseData(),
    );
  }

  private async onResourceChanged(
    resources: ModifiedResource[],
  ): Promise<void> {
    const modified = resources.pop();
    const topic = await this.notificationStorage.get(modified!.resource.path);
    const { subscriptions } = topic!;
    // eslint-disable-next-line guard-for-in
    for (const key in subscriptions) {
      const subscription = subscriptions[key];
      const subscriptionHandler = this.subscriptionHandlers.get(subscription.type);
      await subscriptionHandler!.onResourcesChanged(resources, subscription);
    }
  }
}
