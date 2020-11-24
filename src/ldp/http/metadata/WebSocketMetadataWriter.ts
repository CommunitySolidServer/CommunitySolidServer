import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import { MetadataWriter } from './MetadataWriter';

interface WebSocketSettings {
  hostname?: string;
  port?: number;
  protocol?: string;
}

/**
 * A {@link MetadataWriter} that advertises a WebSocket through the Updates-Via header.
 */
export class WebSocketMetadataWriter extends MetadataWriter {
  private readonly socketUrl: string;

  public constructor(settings: WebSocketSettings = {}) {
    super();
    const { hostname = 'localhost', port = 80, protocol = 'ws:' } = settings;
    const secure = /^(?:https|wss)/u.test(protocol);
    const socketUrl = new URL(`${secure ? 'wss' : 'ws'}://${hostname}:${port}/`);
    if (socketUrl.hostname !== hostname) {
      throw new Error(`Invalid hostname: ${hostname}`);
    }
    this.socketUrl = socketUrl.href.slice(0, -1);
  }

  public async handle({ response }: { response: HttpResponse }): Promise<void> {
    addHeader(response, 'updates-via', this.socketUrl);
  }
}
