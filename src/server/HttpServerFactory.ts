import type { Server } from 'http';

/**
 * A factory for HTTP servers
 */
export interface HttpServerFactory {
  /* eslint-disable @typescript-eslint/method-signature-style */
  startServer(port: number): Server;
  startServer(socket: string): Server;
  startServer(portOrSocket: number | string): Server;
}
