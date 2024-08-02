import { getLoggerFor } from '../../../logging/LogUtil';
import type { Representation } from '../../../http/representation/Representation';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import { readableToString } from '../../../util/StreamUtil';
import type { NotificationChannel } from '../NotificationChannel';
import type { StreamingHttpMap } from './StreamingHttpMap';

export interface StreamingHttpEmitterInput {
  channel: NotificationChannel;
  representation: Representation;
}

/**
 * Emits notifications on StreamingHTTPChannel2023 streams.
 * Uses the response streams found in the provided map.
 * The key should be the identifier of the topic resource.
 */
export class StreamingHttp2023Emitter extends AsyncHandler<StreamingHttpEmitterInput> {
  protected readonly logger = getLoggerFor(this);

  public constructor(
    private readonly streamMap: StreamingHttpMap,
  ) {
    super();
  }

  public async handle({ channel, representation }: StreamingHttpEmitterInput): Promise<void> {
    // Called as a NotificationEmitter: emit the notification
    const streams = this.streamMap.get(channel.topic);
    if (streams) {
      // Ensure that the whole notification gets sent in a single chunk
      const chunk = await readableToString(representation.data);
      for (const stream of streams) {
        stream.write(chunk);
      }
    } else {
      representation.data.destroy();
    }
  }
}
