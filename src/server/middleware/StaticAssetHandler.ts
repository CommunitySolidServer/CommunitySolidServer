import { createReadStream } from 'fs';
import * as mime from 'mime-types';
import { getLoggerFor } from '../../logging/LogUtil';
import { APPLICATION_OCTET_STREAM } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { pipeSafely } from '../../util/StreamUtil';
import type { HttpHandlerInput } from '../HttpHandler';
import { HttpHandler } from '../HttpHandler';
import type { HttpRequest } from '../HttpRequest';

/**
 * Handler that serves static resources on specific paths.
 */
export class StaticAssetHandler extends HttpHandler {
  private readonly assets: Record<string, string>;
  private readonly logger = getLoggerFor(this);

  /**
   * Creates a handler for the provided static resources.
   * @param assets - A mapping from URL paths to file paths.
   */
  public constructor(assets: Record<string, string>) {
    super();
    this.assets = { ...assets };
  }

  public async canHandle({ request }: HttpHandlerInput): Promise<void> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      throw new NotImplementedHttpError('Only GET and HEAD requests are supported');
    }
    if (!(this.getAssetUrl(request) in this.assets)) {
      throw new NotImplementedHttpError(`No static resource at ${request.url}`);
    }
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    // Determine the asset to serve
    const filePath = this.assets[this.getAssetUrl(request)];
    this.logger.debug(`Serving ${request.url} via static asset ${filePath}`);

    // Send the response headers
    const contentType = mime.lookup(filePath) || APPLICATION_OCTET_STREAM;
    response.writeHead(200, { 'content-type': contentType });

    // For HEAD, send an empty body
    if (request.method === 'HEAD') {
      response.end();
    // For GET, stream the asset
    } else {
      const asset = createReadStream(filePath, 'utf8');
      pipeSafely(asset, response);
    }
  }

  private getAssetUrl({ url }: HttpRequest): string {
    return !url ? '' : url.replace(/\?.*/u, '');
  }
}
