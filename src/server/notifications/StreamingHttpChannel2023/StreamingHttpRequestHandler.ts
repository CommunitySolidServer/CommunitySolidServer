import { PassThrough } from 'node:stream';
import type { Credentials } from '../../../authentication/Credentials';
import type { CredentialsExtractor } from '../../../authentication/CredentialsExtractor';
import type { Authorizer } from '../../../authorization/Authorizer';
import type { PermissionReader } from '../../../authorization/PermissionReader';
import { AccessMode } from '../../../authorization/permissions/Permissions';
import { OkResponseDescription } from '../../../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../../../http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../../http/representation/BasicRepresentation';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { OperationHttpHandlerInput } from '../../OperationHttpHandler';
import { OperationHttpHandler } from '../../OperationHttpHandler';
import { guardStream } from '../../../util/GuardedStream';
import { IdentifierSetMultiMap } from '../../../util/map/IdentifierMap';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import type { NotificationGenerator } from '../generate/NotificationGenerator';
import type { NotificationSerializer } from '../serialize/NotificationSerializer';
import { readableToString } from '../../../util/StreamUtil';
import type { StreamingHttpMap } from './StreamingHttpMap';
import { generateChannel } from './StreamingHttp2023Util';

/**
 * Handles request to Streaming HTTP receiveFrom endopints.
 * All allowed requests are stored in the {@link StreamingHttpMap}
 */
export class StreamingHttpRequestHandler extends OperationHttpHandler {
  protected logger = getLoggerFor(this);

  public constructor(
    private readonly streamMap: StreamingHttpMap,
    private readonly route: InteractionRoute,
    private readonly generator: NotificationGenerator,
    private readonly serializer: NotificationSerializer,
    private readonly credentialsExtractor: CredentialsExtractor,
    private readonly permissionReader: PermissionReader,
    private readonly authorizer: Authorizer,
  ) {
    super();
  }

  public async handle({ operation, request }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const encodedUrl = operation.target.path.replace(this.route.getPath(), '');
    const topic = decodeURIComponent(encodedUrl);

    // Verify if the client is allowed to connect
    const credentials = await this.credentialsExtractor.handleSafe(request);
    await this.authorize(credentials, topic);

    const stream = guardStream(new PassThrough());
    this.streamMap.add(topic, stream);
    stream.on('error', (): boolean => this.streamMap.deleteEntry(topic, stream));
    stream.on('close', (): boolean => this.streamMap.deleteEntry(topic, stream));

    const channel = generateChannel({ path: topic });
    // Send initial notification
    try {
      const notification = await this.generator.handle({ channel, topic: { path: topic }});
      const representation = await this.serializer.handleSafe({ channel, notification });
      // Ensure that the whole notification gets sent in a single chunk
      const chunk = await readableToString(representation.data);
      stream.write(chunk);
    } catch (error: unknown) {
      this.logger.error(`Problem emitting initial notification: ${createErrorMessage(error)}`);
    }
    // Pre-established channels use Turtle
    const representation = new BasicRepresentation(topic, operation.target, channel.accept);
    return new OkResponseDescription(
      representation.metadata,
      stream,
    );
  }

  private async authorize(credentials: Credentials, topic: string): Promise<void> {
    const requestedModes = new IdentifierSetMultiMap<AccessMode>([[{ path: topic }, AccessMode.read ]]);
    this.logger.debug(`Retrieved required modes: ${[ ...requestedModes.entrySets() ].join(',')}`);

    const availablePermissions = await this.permissionReader.handleSafe({ credentials, requestedModes });
    this.logger.debug(`Available permissions are ${[ ...availablePermissions.entries() ].join(',')}`);

    await this.authorizer.handleSafe({ credentials, requestedModes, availablePermissions });
    this.logger.debug(`Authorization succeeded, creating notification channel`);
  }
}
