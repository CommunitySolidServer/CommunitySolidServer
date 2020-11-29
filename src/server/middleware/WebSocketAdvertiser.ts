import { addHeader } from '../../util/HeaderUtil';
import { HttpHandler } from '../HttpHandler';
import type { HttpResponse } from '../HttpResponse';

interface WebSocketSettings {
  hostname?: string;
  port?: number;
  protocol?: string;
}

/**
 * Handler that advertises a WebSocket through the Updates-Via header.
 */
export class WebSocketAdvertiser extends HttpHandler {
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
