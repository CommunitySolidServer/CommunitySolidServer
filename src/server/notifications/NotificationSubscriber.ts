import type { Credentials } from '../../authentication/Credentials';
import type { CredentialsExtractor } from '../../authentication/CredentialsExtractor';
import type { Authorizer } from '../../authorization/Authorizer';
import type { PermissionReader } from '../../authorization/PermissionReader';
import { OkResponseDescription } from '../../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../../http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import { getLoggerFor } from '../../logging/LogUtil';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { APPLICATION_LD_JSON, INTERNAL_QUADS } from '../../util/ContentTypes';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import { UnprocessableEntityHttpError } from '../../util/errors/UnprocessableEntityHttpError';
import { endOfStream, readableToQuads } from '../../util/StreamUtil';
import type { OperationHttpHandlerInput } from '../OperationHttpHandler';
import { OperationHttpHandler } from '../OperationHttpHandler';
import type { NotificationChannel } from './NotificationChannel';
import type { NotificationChannelStorage } from './NotificationChannelStorage';
import type { NotificationChannelType } from './NotificationChannelType';

export interface NotificationSubscriberArgs {
  /**
   * The {@link NotificationChannelType} with all the necessary information.
   */
  channelType: NotificationChannelType;
  /**
   * {@link RepresentationConverter} used to convert input data into RDF.
   */
  converter: RepresentationConverter;
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
   * Storage used to store the channels.
   */
  storage: NotificationChannelStorage;
  /**
   * Overrides the expiration feature of channels, by making sure they always expire after the `maxDuration` value.
   * If the expiration of the channel is shorter than `maxDuration`, the original value will be kept.
   * Value is set in minutes. 0 is infinite.
   * Defaults to 20160 minutes, which is 2 weeks.
   */
  maxDuration?: number;
}

/**
 * Handles notification subscriptions by creating a notification channel.
 *
 * Uses the information from the provided {@link NotificationChannelType} to validate the input
 * and verify the request has the required permissions available.
 * If successful the generated channel will be stored in a {@link NotificationChannelStorage}.
 */
export class NotificationSubscriber extends OperationHttpHandler {
  protected logger = getLoggerFor(this);

  private readonly channelType: NotificationChannelType;
  private readonly converter: RepresentationConverter;
  private readonly credentialsExtractor: CredentialsExtractor;
  private readonly permissionReader: PermissionReader;
  private readonly authorizer: Authorizer;
  private readonly storage: NotificationChannelStorage;
  private readonly maxDuration: number;

  public constructor(args: NotificationSubscriberArgs) {
    super();
    this.channelType = args.channelType;
    this.converter = args.converter;
    this.credentialsExtractor = args.credentialsExtractor;
    this.permissionReader = args.permissionReader;
    this.authorizer = args.authorizer;
    this.storage = args.storage;
    this.maxDuration = (args.maxDuration ?? 20160) * 60 * 1000;
  }

  public async handle({ operation, request }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    if (operation.method === 'GET' || operation.method === 'HEAD') {
      const description = JSON.stringify(this.channelType.getDescription(), null, 2);
      const representation = new BasicRepresentation(description, operation.target, APPLICATION_LD_JSON);
      return new OkResponseDescription(
        representation.metadata,
        operation.method === 'GET' ? representation.data : undefined,
      );
    }

    const credentials = await this.credentialsExtractor.handleSafe(request);
    this.logger.debug(`Extracted credentials: ${JSON.stringify(credentials)}`);

    let channel: NotificationChannel;
    try {
      const quadStream = await this.converter.handleSafe({
        identifier: operation.target,
        representation: operation.body,
        preferences: { type: { [INTERNAL_QUADS]: 1 }},
      });
      channel = await this.channelType.initChannel(await readableToQuads(quadStream.data), credentials);
    } catch (error: unknown) {
      throw new UnprocessableEntityHttpError(
        `Unable to process notification channel: ${createErrorMessage(error)}`,
        { cause: error },
      );
    }

    if (this.maxDuration) {
      const duration = (channel.endAt ?? Number.POSITIVE_INFINITY) - Date.now();
      if (duration > this.maxDuration) {
        channel.endAt = Date.now() + this.maxDuration;
      }
    }

    // Verify if the client is allowed to subscribe
    await this.authorize(credentials, channel);

    // Store the channel once it has been authorized
    await this.storage.add(channel);

    // Generate the response JSON-LD
    const jsonld = await this.channelType.toJsonLd(channel);
    const response = new BasicRepresentation(JSON.stringify(jsonld), APPLICATION_LD_JSON);

    // Complete the channel once the response has been sent out
    endOfStream(response.data)
      .then(async(): Promise<void> => this.channelType.completeChannel(channel))
      .catch((error): void => {
        this.logger.error(`There was an issue completing notification channel ${channel.id}: ${
          createErrorMessage(error)}`);
      });

    return new OkResponseDescription(response.metadata, response.data);
  }

  private async authorize(credentials: Credentials, channel: NotificationChannel): Promise<void> {
    const requestedModes = await this.channelType.extractModes(channel);
    this.logger.debug(`Retrieved required modes: ${[ ...requestedModes.entrySets() ].join(',')}`);

    const availablePermissions = await this.permissionReader.handleSafe({ credentials, requestedModes });
    this.logger.debug(`Available permissions are ${[ ...availablePermissions.entries() ].join(',')}`);

    await this.authorizer.handleSafe({ credentials, requestedModes, availablePermissions });
    this.logger.debug(`Authorization succeeded, creating notification channel`);
  }
}
