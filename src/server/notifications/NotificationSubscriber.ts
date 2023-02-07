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
import type { NotificationChannelJson } from './NotificationChannel';
import type { NotificationChannelType } from './NotificationChannelType';

export interface NotificationSubscriberArgs {
  /**
   * The {@link NotificationChannelType} with all the necessary information.
   */
  channelType: NotificationChannelType;
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
   * Overrides the expiration feature of channels, by making sure they always expire after the `maxDuration` value.
   * If the expiration of the channel is shorter than `maxDuration`, the original value will be kept.
   * Value is set in minutes. 0 is infinite.
   */
  maxDuration?: number;
}

/**
 * Handles notification subscriptions by creating a notification channel.
 *
 * Uses the information from the provided {@link NotificationChannelType} to validate the input
 * and verify the request has the required permissions available.
 */
export class NotificationSubscriber extends OperationHttpHandler {
  protected logger = getLoggerFor(this);

  private readonly channelType: NotificationChannelType;
  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly permissionReader: PermissionReader;
  private readonly authorizer: Authorizer;
  private readonly maxDuration: number;

  public constructor(args: NotificationSubscriberArgs) {
    super();
    this.channelType = args.channelType;
    this.credentialsExtractor = args.credentialsExtractor;
    this.permissionReader = args.permissionReader;
    this.authorizer = args.authorizer;
    this.maxDuration = (args.maxDuration ?? 0) * 60 * 1000;
  }

  public async handle({ operation, request }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    if (operation.body.metadata.contentType !== APPLICATION_LD_JSON) {
      throw new UnsupportedMediaTypeHttpError('Subscribe bodies need to be application/ld+json.');
    }

    let channel: NotificationChannelJson;
    try {
      const json = JSON.parse(await readableToString(operation.body.data));
      channel = await this.channelType.schema.validate(json);
    } catch (error: unknown) {
      throw new UnprocessableEntityHttpError(`Unable to process notification channel: ${createErrorMessage(error)}`);
    }

    if (this.maxDuration) {
      const duration = (channel.endAt ?? Number.POSITIVE_INFINITY) - Date.now();
      if (duration > this.maxDuration) {
        channel.endAt = Date.now() + this.maxDuration;
      }
    }

    // Verify if the client is allowed to subscribe
    const credentials = await this.authorize(request, channel);

    const { response } = await this.channelType.subscribe(channel, credentials);

    return new OkResponseDescription(response.metadata, response.data);
  }

  private async authorize(request: HttpRequest, channel: NotificationChannelJson): Promise<Credentials> {
    const credentials = await this.credentialsExtractor.handleSafe(request);
    this.logger.debug(`Extracted credentials: ${JSON.stringify(credentials)}`);

    const requestedModes = await this.channelType.extractModes(channel);
    this.logger.debug(`Retrieved required modes: ${[ ...requestedModes.entrySets() ]}`);

    const availablePermissions = await this.permissionReader.handleSafe({ credentials, requestedModes });
    this.logger.debug(`Available permissions are ${[ ...availablePermissions.entries() ]}`);

    await this.authorizer.handleSafe({ credentials, requestedModes, availablePermissions });
    this.logger.verbose(`Authorization succeeded, creating notification channel`);

    return credentials;
  }
}
