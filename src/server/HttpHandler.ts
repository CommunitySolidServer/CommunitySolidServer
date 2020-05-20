import { IncomingMessage, ServerResponse } from 'http';

/**
 * An HTTP request handler.
 */
export interface HttpHandler {
  /**
   * Checks whether this handler supports the given request.
   * @param req - The input request.
   *
   * @returns A promise that indicates if this request is supported after resolving.
   */
  canHandle: (req: Request) => Promise<boolean>;
  /**
   * Handles the given request.
   * @param req - The input request.
   * @param res - The response needed for responding to the request.
   *
   * @returns A promise resolving when the handling is finished.
   */
  handle: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}
