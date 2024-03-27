import { createReadStream } from 'node:fs';
import escapeStringRegexp from 'escape-string-regexp';
import * as mime from 'mime-types';
import { getLoggerFor } from '../../logging/LogUtil';
import { APPLICATION_OCTET_STREAM } from '../../util/ContentTypes';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { SystemError } from '../../util/errors/SystemError';
import { ensureTrailingSlash, joinFilePath, resolveAssetPath, trimLeadingSlashes } from '../../util/PathUtil';
import { pipeSafely } from '../../util/StreamUtil';
import type { HttpHandlerInput } from '../HttpHandler';
import { HttpHandler } from '../HttpHandler';
import type { HttpRequest } from '../HttpRequest';

/**
 * Used to link file paths with relative URLs.
 * By using a separate class instead of a key/value map it is easier to replace values in Components.js.
 */
export class StaticAssetEntry {
  public constructor(
    public readonly relativeUrl: string,
    public readonly filePath: string,
  ) {}
}

/**
 * Handler that serves static resources on specific paths.
 * Relative file paths are assumed to be relative to the current working directory.
 * Relative file paths can be preceded by `@css:`, e.g. `@css:foo/bar`,
 * in case they need to be relative to the module root.
 * File paths ending in a slash assume the target is a folder and map all of its contents.
 */
export class StaticAssetHandler extends HttpHandler {
  private readonly mappings: Record<string, string>;
  private readonly pathMatcher: RegExp;
  private readonly expires: number;
  private readonly logger = getLoggerFor(this);

  /**
   * Creates a handler for the provided static resources.
   *
   * @param assets - A list of {@link StaticAssetEntry}.
   * @param baseUrl - The base URL of the server.
   * @param options - Specific options.
   * @param options.expires - Cache expiration time in seconds.
   */
  public constructor(assets: StaticAssetEntry[], baseUrl: string, options: { expires?: number } = {}) {
    super();
    this.mappings = {};
    const rootPath = ensureTrailingSlash(new URL(baseUrl).pathname);

    for (const { relativeUrl, filePath } of assets) {
      this.mappings[trimLeadingSlashes(relativeUrl)] = resolveAssetPath(filePath);
    }
    this.pathMatcher = this.createPathMatcher(rootPath);
    this.expires = Number.isInteger(options.expires) ? Math.max(0, options.expires!) : 0;
  }

  /**
   * Creates a regular expression that matches the URL paths.
   */
  private createPathMatcher(rootPath: string): RegExp {
    // Sort longest paths first to ensure the longest match has priority
    const paths = Object.keys(this.mappings)
      .sort((pathA, pathB): number => pathB.length - pathA.length);

    // Collect regular expressions for files and folders separately.
    // The arrays need initial values to prevent matching everything, as they will if these are empty.
    const files = [ '.^' ];
    const folders = [ '.^' ];
    for (const path of paths) {
      const filePath = this.mappings[path];
      if (filePath.endsWith('/') && !path.endsWith('/')) {
        throw new InternalServerError(
          `Server is misconfigured: StaticAssetHandler can not ` +
          `have a file path ending on a slash if the URL does not, but received ${path} and ${filePath}`,
        );
      }
      (filePath.endsWith('/') ? folders : files).push(escapeStringRegexp(path));
    }

    // Either match an exact document or a file within a folder (stripping the query string)
    return new RegExp(`^${rootPath}(?:(${files.join('|')})|(${folders.join('|')})([^?]+))(?:\\?.*)?$`, 'u');
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

    return typeof document === 'string' ?
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
        response.writeHead(200, {
          // eslint-disable-next-line ts/naming-convention
          'content-type': contentType,
          ...this.getCacheHeaders(),
        });

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
        const { code } = error as SystemError;
        // When the file if not found or a folder, signal a 404
        if (code === 'ENOENT' || code === 'EISDIR') {
          this.logger.debug(`Static asset ${filePath} not found`);
          reject(new NotFoundHttpError(`Cannot find ${request.url}`));
        // In other cases, we might already have started writing, so just hang up
        } else {
          this.logger.warn(`Error reading asset ${filePath}: ${error.message}`);
          response.end();
          asset.destroy();
          resolve();
        }
      });
    });
  }

  private getCacheHeaders(): Record<string, string> {
    return this.expires <= 0 ?
        {} :
        {
          // eslint-disable-next-line ts/naming-convention
          'cache-control': `max-age=${this.expires}`,
          expires: new Date(Date.now() + this.expires * 1000).toUTCString(),
        };
  }
}
