import type { Credentials } from '../../authentication/Credentials';
import type { CredentialsExtractor } from '../../authentication/CredentialsExtractor';
import type { Authorizer } from '../../authorization/Authorizer';
import type { PermissionReader } from '../../authorization/PermissionReader';
import { OkResponseDescription } from '../../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../../http/output/response/ResponseDescription';
import { getLoggerFor } from '../../logging/LogUtil';
import { APPLICATION_LD_JSON } from '../../util/ContentTypes';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import { UnprocessableEntityHttpError } from '../../util/errors/UnprocessableEntityHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import { readableToString } from '../../util/StreamUtil';
import type { HttpRequest } from '../HttpRequest';
import type { OperationHttpHandlerInput } from '../OperationHttpHandler';
import { OperationHttpHandler } from '../OperationHttpHandler';
import type { Subscription } from './Subscription';
import type { SubscriptionType } from './SubscriptionType';

export interface NotificationSubscriberArgs {
  /**
   * The {@link SubscriptionType} with all the necessary information.
   */
  subscriptionType: SubscriptionType;
  /**
   * Used to extract the credentials from the request.
   */
  credentialsExtractor: CredentialsExtractor;
  /**
   * Used to determine which permissions the found credentials have.
   */
  permissionReader: PermissionReader;
  /**
   * Used to determine if the request has the necessary permissions.
   */
  authorizer: Authorizer;
  /**
   * Overrides the expiration feature of subscriptions by making sure they always expire after the `maxDuration` value.
   * In case the expiration of the subscription is shorter than `maxDuration` the original value will be kept.
   * Value is set in minutes. 0 is infinite.
   */
  maxDuration?: number;
}

/**
 * Handles notification subscriptions.
 *
 * Uses the information from the provided {@link SubscriptionType} to validate the input
 * and verify the request has the required permissions available.
 */
export class NotificationSubscriber extends OperationHttpHandler {
  protected logger = getLoggerFor(this);

  private readonly subscriptionType: SubscriptionType;
  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly permissionReader: PermissionReader;
  private readonly authorizer: Authorizer;
  private readonly maxDuration: number;

  public constructor(args: NotificationSubscriberArgs) {
    super();
    this.subscriptionType = args.subscriptionType;
    this.credentialsExtractor = args.credentialsExtractor;
    this.permissionReader = args.permissionReader;
    this.authorizer = args.authorizer;
    this.maxDuration = (args.maxDuration ?? 0) * 60 * 1000;
  }

  public async handle({ operation, request }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    if (operation.body.metadata.contentType !== APPLICATION_LD_JSON) {
      throw new UnsupportedMediaTypeHttpError('Subscribe bodies need to be application/ld+json.');
    }

    let subscription: Subscription;
    try {
      const json = JSON.parse(await readableToString(operation.body.data));
      subscription = await this.subscriptionType.schema.validate(json);
    } catch (error: unknown) {
      throw new UnprocessableEntityHttpError(`Unable to process subscription: ${createErrorMessage(error)}`);
    }

    if (this.maxDuration) {
      const duration = (subscription.expiration ?? Number.POSITIVE_INFINITY) - Date.now();
      if (duration > this.maxDuration) {
        subscription.expiration = Date.now() + this.maxDuration;
      }
    }

    // Verify if the client is allowed to subscribe
    const credentials = await this.authorize(request, subscription);

    const { response } = await this.subscriptionType.subscribe(subscription, credentials);

    return new OkResponseDescription(response.metadata, response.data);
  }

  private async authorize(request: HttpRequest, subscription: Subscription): Promise<Credentials> {
    const credentials = await this.credentialsExtractor.handleSafe(request);
    this.logger.debug(`Extracted credentials: ${JSON.stringify(credentials)}`);

    const requestedModes = await this.subscriptionType.extractModes(subscription);
    this.logger.debug(`Retrieved required modes: ${[ ...requestedModes.entrySets() ]}`);

    const availablePermissions = await this.permissionReader.handleSafe({ credentials, requestedModes });
    this.logger.debug(`Available permissions are ${[ ...availablePermissions.entries() ]}`);

    await this.authorizer.handleSafe({ credentials, requestedModes, availablePermissions });
    this.logger.verbose(`Authorization succeeded, creating subscription`);

    return credentials;
  }
}
