import { createReadStream } from 'fs';
import escapeStringRegexp from 'escape-string-regexp';
import * as mime from 'mime-types';
import { getLoggerFor } from '../../logging/LogUtil';
import { APPLICATION_OCTET_STREAM } from '../../util/ContentTypes';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { joinFilePath } from '../../util/PathUtil';
import { pipeSafely } from '../../util/StreamUtil';
import type { HttpHandlerInput } from '../HttpHandler';
import { HttpHandler } from '../HttpHandler';
import type { HttpRequest } from '../HttpRequest';

/**
 * Handler that serves static resources on specific paths.
 */
export class StaticAssetHandler extends HttpHandler {
  private readonly mappings: Record<string, string>;
  private readonly pathMatcher: RegExp;
  private readonly logger = getLoggerFor(this);

  /**
   * Creates a handler for the provided static resources.
   * @param assets - A mapping from URL paths to paths,
   *  where URL paths ending in a slash are interpreted as entire folders.
   */
  public constructor(assets: Record<string, string>) {
    super();
    this.mappings = { ...assets };
    this.pathMatcher = this.createPathMatcher(assets);
  }

  /**
   * Creates a regular expression that matches the URL paths.
   */
  private createPathMatcher(assets: Record<string, string>): RegExp {
    // Sort longest paths first to ensure the longest match has priority
    const paths = Object.keys(assets)
      .sort((pathA, pathB): number => pathB.length - pathA.length);

    // Collect regular expressions for files and folders separately
    const files = [ '.^' ];
    const folders = [ '.^' ];
    for (const path of paths) {
      (path.endsWith('/') ? folders : files).push(escapeStringRegexp(path));
    }

    // Either match an exact document or a file within a folder (stripping the query string)
    return new RegExp(`^(?:(${files.join('|')})|(${folders.join('|')})([^?]+))(?:\\?.*)?$`, 'u');
  }

  /**
   * Obtains the file path corresponding to the asset URL
   */
  private getFilePath({ url }: HttpRequest): string {
    // Verify if the URL matches any of the paths
    const match = this.pathMatcher.exec(url ?? '');
    if (!match || match[0].includes('/..')) {
      throw new NotImplementedHttpError(`No static resource configured at ${url}`);
    }

    // The mapping is either a known document, or a file within a folder
    const [ , document, folder, file ] = match;
    return document ?
      this.mappings[document] :
      joinFilePath(this.mappings[folder], decodeURIComponent(file));
  }

  public async canHandle({ request }: HttpHandlerInput): Promise<void> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      throw new NotImplementedHttpError('Only GET and HEAD requests are supported');
    }
    this.getFilePath(request);
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    // Determine the asset to serve
    const filePath = this.getFilePath(request);
    this.logger.debug(`Serving ${request.url} via static asset ${filePath}`);

    // Resolve when asset loading succeeds
    const asset = createReadStream(filePath);
    return new Promise((resolve, reject): void => {
      // Write a 200 response when the asset becomes readable
      asset.once('readable', (): void => {
        const contentType = mime.lookup(filePath) || APPLICATION_OCTET_STREAM;
        response.writeHead(200, { 'content-type': contentType });

        // With HEAD, only write the headers
        if (request.method === 'HEAD') {
          response.end();
          asset.destroy();
        // With GET, pipe the entire response
        } else {
          pipeSafely(asset, response);
        }
        resolve();
      });

      // Pass the error when something goes wrong
      asset.once('error', (error): void => {
        const { code } = error as any;
        // When the file if not found or a folder, signal a 404
        if (code === 'ENOENT' || code === 'EISDIR') {
          this.logger.debug(`Static asset ${filePath} not found`);
          reject(new NotFoundHttpError(`Cannot find ${request.url}`));
        // In other cases, we might already have started writing, so just hang up
        } else {
          this.logger.warn(`Error reading asset ${filePath}: ${error.message}`, { error });
          response.end();
          asset.destroy();
          resolve();
        }
      });
    });
  }
}
