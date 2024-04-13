import { PassThrough } from 'node:stream';
import { randomUUID } from 'node:crypto';
import type { Credentials } from '../../../authentication/Credentials';
import type { CredentialsExtractor } from '../../../authentication/CredentialsExtractor';
import type { Authorizer } from '../../../authorization/Authorizer';
import type { PermissionReader } from '../../../authorization/PermissionReader';
import { AccessMode } from '../../../authorization/permissions/Permissions';
import { OkResponseDescription } from '../../../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../../../http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../../http/representation/BasicRepresentation';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { OperationHttpHandlerInput } from '../../OperationHttpHandler';
import { OperationHttpHandler } from '../../OperationHttpHandler';
import { guardStream } from '../../../util/GuardedStream';
import { IdentifierSetMultiMap } from '../../../util/map/IdentifierMap';
import type { NotificationChannel } from '../NotificationChannel';
import { NOTIFY } from '../../../util/Vocabularies';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import type { NotificationGenerator } from '../generate/NotificationGenerator';
import type { NotificationSerializer } from '../serialize/NotificationSerializer';
import type { StreamingHttpMap } from './StreamingHttpMap';

/**
 * Handles request to Streaming HTTP receiveFrom endopints.
 * All allowed requests are stored in the {@link StreamingHttpMap}
 */
export class StreamingHttpRequestHandler extends OperationHttpHandler {
  protected logger = getLoggerFor(this);

  public constructor(
    private readonly streamMap: StreamingHttpMap,
    private readonly pathPrefix: string,
    private readonly generator: NotificationGenerator,
    private readonly serializer: NotificationSerializer,
    private readonly credentialsExtractor: CredentialsExtractor,
    private readonly permissionReader: PermissionReader,
    private readonly authorizer: Authorizer,
  ) {
    super();
  }

  public async handle({ operation, request }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const topic = operation.target.path.replace(this.pathPrefix, '');

    // Verify if the client is allowed to connect
    const credentials = await this.credentialsExtractor.handleSafe(request);
    await this.authorize(credentials, topic);

    const stream = guardStream(new PassThrough());
    this.streamMap.add(topic, stream);
    stream.on('error', (): boolean => this.streamMap.deleteEntry(topic, stream));
    stream.on('close', (): boolean => this.streamMap.deleteEntry(topic, stream));

    const channel: NotificationChannel = {
      id: `urn:uuid:${randomUUID()}`,
      type: NOTIFY.StreamingHTTPChannel2023,
      topic,
      accept: 'text/turtle',
    };
    // Send initial notification
    try {
      const notification = await this.generator.handle({ channel, topic: { path: topic }});
      const representation = await this.serializer.handleSafe({ channel, notification });
      representation.data.pipe(stream, { end: false });
    } catch (error: unknown) {
      this.logger.error(`Problem emitting initial notification: ${createErrorMessage(error)}`);
    }
    // Pre-established channels use Turtle
    const representation = new BasicRepresentation(topic, operation.target, 'text/turtle');
    return new OkResponseDescription(
      representation.metadata,
      stream,
    );
  }

  /**
   * TODO: consider removing duplication with {@link NotificationsSubscriber}
   */
  private async authorize(credentials: Credentials, topic: string): Promise<void> {
    const requestedModes = new IdentifierSetMultiMap<AccessMode>([[{ path: topic }, AccessMode.read ]]);
    this.logger.debug(`Retrieved required modes: ${[ ...requestedModes.entrySets() ].join(',')}`);

    const availablePermissions = await this.permissionReader.handleSafe({ credentials, requestedModes });
    this.logger.debug(`Available permissions are ${[ ...availablePermissions.entries() ].join(',')}`);

    await this.authorizer.handleSafe({ credentials, requestedModes, availablePermissions });
    this.logger.debug(`Authorization succeeded, creating notification channel`);
  }
}
