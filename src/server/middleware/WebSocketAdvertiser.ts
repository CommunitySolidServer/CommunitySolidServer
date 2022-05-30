import { addHeader, hasScheme } from '../../util/HeaderUtil';
import { HttpHandler } from '../HttpHandler';
import type { HttpResponse } from '../HttpResponse';

/**
 * Handler that advertises a WebSocket through the Updates-Via header.
 */
export class WebSocketAdvertiser extends HttpHandler {
  private readonly socketUrl: string;

  public constructor(baseUrl: string) {
    super();
    const socketUrl = new URL(baseUrl);
    socketUrl.protocol = hasScheme(baseUrl, 'http', 'ws') ? 'ws:' : 'wss:';
    this.socketUrl = socketUrl.href;
  }

  public async handle({ response }: { response: HttpResponse }): Promise<void> {
    addHeader(response, 'Updates-Via', this.socketUrl);
  }
}
