import type { TLSSocket } from 'tls';
import { format } from 'url';
import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpRequest } from '../../server/HttpRequest';
import { toCanonicalUrl } from '../../util/Util';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import { TargetExtractor } from './TargetExtractor';

/**
 * Extracts an identifier from an incoming {@link HttpRequest}.
 * Uses URL library for basic parsing.
 * TODO: input requires more extensive cleaning/parsing based on headers (see #22).
 */
export class BasicTargetExtractor extends TargetExtractor {
  protected readonly logger = getLoggerFor(this);

  public async canHandle(): Promise<void> {
    // Can handle all URLs
  }

  public async handle(input: HttpRequest): Promise<ResourceIdentifier> {
    if (!input.url) {
      this.logger.error('Missing URL in HttpRequest.');
      throw new Error('Missing URL.');
    }
    if (!input.headers.host) {
      this.logger.error('Missing host in HttpRequest.');
      throw new Error('Missing host.');
    }
    const isHttps = input.connection && (input.connection as TLSSocket).encrypted;
    const url = format({
      protocol: `http${isHttps ? 's' : ''}`,
      host: input.headers.host,
      pathname: input.url,
    });

    return { path: toCanonicalUrl(url) };
  }
}
