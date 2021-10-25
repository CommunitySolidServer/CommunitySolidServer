import type { TLSSocket } from 'tls';
import type { HttpRequest } from '../../../server/HttpRequest';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { InternalServerError } from '../../../util/errors/InternalServerError';
import { parseForwarded } from '../../../util/HeaderUtil';
import { toCanonicalUriPath } from '../../../util/PathUtil';
import type { ResourceIdentifier } from '../../representation/ResourceIdentifier';
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
      throw new InternalServerError('Missing URL');
    }

    // Extract host and protocol (possibly overridden by the Forwarded/X-Forwarded-* header)
    let { host } = headers;
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
      throw new BadRequestHttpError('Missing Host header');
    }
    if (/[/\\*]/u.test(host)) {
      throw new BadRequestHttpError(`The request has an invalid Host header: ${host}`);
    }

    // URL object applies punycode encoding to domain
    const originalUrl = new URL(`${protocol}://${host}`);
    const [ , pathname, search ] = /^([^?]*)(.*)/u.exec(toCanonicalUriPath(url))!;
    originalUrl.pathname = pathname;
    if (this.includeQueryString && search) {
      originalUrl.search = search;
    }

    return { path: originalUrl.href };
  }
}
