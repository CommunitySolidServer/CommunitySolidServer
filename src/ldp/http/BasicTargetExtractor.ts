import type { TLSSocket } from 'tls';
import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpRequest } from '../../server/HttpRequest';
import { toCanonicalUriPath } from '../../util/PathUtil';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import { TargetExtractor } from './TargetExtractor';

/**
 * Extracts an identifier from an incoming {@link HttpRequest}.
 * Uses URL library for basic parsing.
 * TODO: input requires more extensive cleaning/parsing based on headers (see #22).
 */
export class BasicTargetExtractor extends TargetExtractor {
  protected readonly logger = getLoggerFor(this);

  public async handle(request: HttpRequest): Promise<ResourceIdentifier> {
    if (!request.url) {
      this.logger.error('The request has no URL');
      throw new Error('Missing URL');
    }
    if (!request.headers.host) {
      this.logger.error('The request has no Host header');
      throw new Error('Missing Host header');
    }

    const isHttps = request.connection && (request.connection as TLSSocket).encrypted;
    this.logger.debug(`Request is using HTTPS: ${isHttps}`);

    // URL object applies punycode encoding to domain
    const base = `http${isHttps ? 's' : ''}://${request.headers.host}`;
    const url = toCanonicalUriPath(request.url);
    const path = new URL(url, base).href;

    return { path };
  }
}
