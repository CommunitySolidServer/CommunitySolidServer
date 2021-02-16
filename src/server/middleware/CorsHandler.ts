import cors from 'cors';
import type { CorsOptions, CorsRequest } from 'cors';
import type { HttpHandlerInput } from '../HttpHandler';
import { HttpHandler } from '../HttpHandler';

const defaultOptions: CorsOptions = {
  origin: (origin: any, callback: any): void => callback(null, origin ?? '*'),
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
 * In case of an OPTIONS request this handler will close the connection after adding its headers.
 *
 * Solid, §7.1: "A data pod MUST implement the CORS protocol [FETCH] such that, to the extent possible,
 * the browser allows Solid apps to send any request and combination of request headers to the data pod,
 * and the Solid app can read any response and response headers received from the data pod."
 * Full details: https://solid.github.io/specification/protocol#cors-server
 */
export class CorsHandler extends HttpHandler {
  private readonly corsHandler: (
    req: CorsRequest,
    res: {
      statusCode?: number;
      setHeader: (key: string, value: string) => any;
      end: () => any;
    },
    next: (err?: any) => any,
  ) => void;

  public constructor(options: SimpleCorsOptions = {}) {
    super();
    this.corsHandler = cors({ ...defaultOptions, ...options });
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    return new Promise((resolve): void => {
      this.corsHandler(input.request as any, input.response as any, (): void => resolve());
    });
  }
}
