import type { Server } from 'http';

/**
 * A factory for HTTP servers
 */
export interface HttpServerFactory {
  startServer: (port: number) => Server;
}
