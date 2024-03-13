import cors from 'cors';
import type { CorsOptions, CorsRequest } from 'cors';
import type { HttpHandlerInput } from '../HttpHandler';
import { HttpHandler } from '../HttpHandler';

const defaultOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, origin?: string) => void): void =>
    callback(null, origin ?? '*'),
};

// Components.js does not support the full CorsOptions yet
interface SimpleCorsOptions {
  origin?: string;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

/**
 * Handler that sets CORS options on the response.
 * In case of an OPTIONS request this handler will close the connection after adding its headers
 * if `preflightContinue` is set to `false`.
 *
 * Solid, §8.1: "A server MUST implement the CORS protocol [FETCH] such that, to the extent possible,
 * the browser allows Solid apps to send any request and combination of request headers to the server,
 * and the Solid app can read any response and response headers received from the server."
 * Full details: https://solidproject.org/TR/2021/protocol-20211217#cors-server
 */
export class CorsHandler extends HttpHandler {
  private readonly corsHandler: (
    req: CorsRequest,
    res: {
      statusCode?: number;
      setHeader: (key: string, value: string) => unknown;
      end: () => unknown;
    },
    next: (err?: unknown) => unknown,
  ) => void;

  public constructor(options: SimpleCorsOptions = {}) {
    super();
    this.corsHandler = cors({ ...defaultOptions, ...options });
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    return new Promise((resolve): void => {
      this.corsHandler(input.request, input.response, (): void => resolve());
    });
  }
}
