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
  public async handle({ request: { url, connection, headers }}: { request: HttpRequest }): Promise<ResourceIdentifier> {
    if (!url) {
      throw new Error('Missing URL');
    }

    // Extract host and protocol (possibly overridden by the Forwarded header)
    let { host } = headers;
    let protocol = (connection as TLSSocket)?.encrypted ? 'https' : 'http';
    if (headers.forwarded) {
      const forwarded = parseForwarded(headers.forwarded);
      if (forwarded.host) {
        ({ host } = forwarded);
      }
      if (forwarded.proto) {
        ({ proto: protocol } = forwarded);
      }
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
    const path = new URL(toCanonicalUriPath(url), base).href;
    return { path };
  }
}
