import { getLoggerFor } from '../../../logging/LogUtil';
import { StreamingHTTPMap } from './StreamingHTTPMap';

import type { Representation } from '../../../http/representation/Representation';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import { NotificationChannel } from '../NotificationChannel';

export interface StreamingHTTPEmitterInput {
  channel: NotificationChannel;
  representation: Representation;
}

/**
 * Emits notifications on StreamingHTTPChannel2023 streams.
 * Uses the StreamingHTTPs found in the provided map.
 * The key should be the identifier of the topic resource.
 */
export class StreamingHTTP2023Emitter extends AsyncHandler<StreamingHTTPEmitterInput>  {
  protected readonly logger = getLoggerFor(this);

  constructor(
    private readonly streamMap: StreamingHTTPMap
  ) {
    super()
  }

  public async handle({ channel, representation }: StreamingHTTPEmitterInput): Promise<void> {
    // Called as a NotificationEmitter: emit the notification
    const streams = this.streamMap.get(channel.topic);
    if (streams) {
      for (const stream of streams) {
        representation.data.pipe(stream, { end: false })
      }
    } else {
      representation.data.destroy();
    }
  }
}
