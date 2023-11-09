import type { TLSSocket } from 'node:tls';
import type { HttpRequest } from '../../../server/HttpRequest';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { errorTermsToMetadata } from '../../../util/errors/HttpErrorUtil';
import { InternalServerError } from '../../../util/errors/InternalServerError';
import { parseForwarded } from '../../../util/HeaderUtil';
import type { IdentifierStrategy } from '../../../util/identifiers/IdentifierStrategy';
import { toCanonicalUriPath } from '../../../util/PathUtil';
import type { ResourceIdentifier } from '../../representation/ResourceIdentifier';
import { TargetExtractor } from './TargetExtractor';

export interface OriginalUrlExtractorArgs {
  /**
   * The IdentifierStrategy to use for checking the scope of the request
   */
  identifierStrategy: IdentifierStrategy;

  /**
   * Specify whether the OriginalUrlExtractor should include the request query string.
   */
  includeQueryString?: boolean;
}

/**
 * Reconstructs the original URL of an incoming {@link HttpRequest}.
 */
export class OriginalUrlExtractor extends TargetExtractor {
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly includeQueryString: boolean;

  public constructor(args: OriginalUrlExtractorArgs) {
    super();
    this.identifierStrategy = args.identifierStrategy;
    this.includeQueryString = args.includeQueryString ?? true;
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

    // Create ResourceIdentifier instance
    const identifier = { path: originalUrl.href };

    // Check if the configured IdentifierStrategy supports the identifier
    if (!this.identifierStrategy.supportsIdentifier(identifier)) {
      throw new InternalServerError(
        `The identifier ${identifier.path} is outside the configured identifier space.`,
        { errorCode: 'E0001', metadata: errorTermsToMetadata({ path: identifier.path }) },
      );
    }

    return identifier;
  }
}
