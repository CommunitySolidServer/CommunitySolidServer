import type { TLSSocket } from 'tls';
import type { HttpRequest } from '../../server/HttpRequest';
import { parseForwarded } from '../../util/HeaderUtil';
import { toCanonicalUriPath } from '../../util/PathUtil';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import { TargetExtractor } from './TargetExtractor';

/**
 * Reconstructs the original URL of an incoming {@link HttpRequest}.
 */
export class OriginalUrlExtractor extends TargetExtractor {
  private readonly includeQueryString: boolean;

  public constructor(options: { includeQueryString?: boolean } = {}) {
    super();
    this.includeQueryString = options.includeQueryString ?? true;
  }

  public async handle({ request: { url, connection, headers }}: { request: HttpRequest }): Promise<ResourceIdentifier> {
    if (!url) {
      throw new Error('Missing URL');
    }

    // Extract host and protocol (possibly overridden by the Forwarded/X-Forwarded-* header)
    let { host }: { host?: string } = headers;
    let protocol = (connection as TLSSocket)?.encrypted ? 'https' : 'http';

    // Check Forwarded/X-Forwarded-* headers
    const forwarded = parseForwarded(headers);
    if (forwarded.host) {
      ({ host } = forwarded);
    }
    if (forwarded.proto) {
      ({ proto: protocol } = forwarded);
    }

    // Perform a sanity check on the host
    if (!host) {
      throw new Error('Missing Host header');
    }
    if (/[/\\*]/u.test(host)) {
      throw new Error(`The request has an invalid Host header: ${host}`);
    }

    // URL object applies punycode encoding to domain
    const base = `${protocol}://${host}`;
    const originalUrl = new URL(toCanonicalUriPath(url), base);

    // Drop the query string if requested
    if (!this.includeQueryString) {
      originalUrl.search = '';
    }

    return { path: originalUrl.href };
  }
}
