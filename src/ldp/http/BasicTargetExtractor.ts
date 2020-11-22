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

  public async handle({ url, headers: { host }, connection }: HttpRequest): Promise<ResourceIdentifier> {
    if (!url) {
      this.logger.error('The request has no URL');
      throw new Error('Missing URL');
    }
    if (!host) {
      this.logger.error('The request has no Host header');
      throw new Error('Missing Host header');
    }
    if (/[/\\*]/u.test(host)) {
      throw new Error(`The request has an invalid Host header: ${host}`);
    }

    const isHttps = (connection as TLSSocket)?.encrypted;
    this.logger.debug(`Request is using HTTPS: ${isHttps}`);

    // URL object applies punycode encoding to domain
    const base = `http${isHttps ? 's' : ''}://${host}`;
    const path = new URL(toCanonicalUriPath(url), base).href;

    return { path };
  }
}
