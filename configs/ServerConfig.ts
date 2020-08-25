import { ExpressHttpServer } from '..';

export interface ServerConfig {
  base: string;
  /**
   * Checks if the incoming request can be handled. The check is very non-restrictive and will usually be true.
   * It is based on whether the incoming request can be parsed to an operation.
   * @param input - Incoming request and response. Only the request will be used.
   *
   * @returns A promise resolving if this request can be handled, otherwise rejecting with an Error.
   */
  getHttpServer(): Promise<ExpressHttpServer>;
}
