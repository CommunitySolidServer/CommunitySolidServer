import type { Server } from 'http';
import { Server as HttpsServer } from 'https';

/**
 * Returns `true` if the server is an HTTPS server.
 */
export function isHttpsServer(server: Server): server is HttpsServer {
  return server instanceof HttpsServer;
}

/**
 * A factory for HTTP servers.
 */
export interface HttpServerFactory {
  createServer: () => Promise<Server>;
}
