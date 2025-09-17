import type { TLSSocket } from 'node:tls';
import { getLoggerFor } from '../../../logging/LogUtil';
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

  /**
   * Forces the server to always assume the host header to be the value of the defined base URL.
   * Useful for debugging when you're trying to access the server both internally and externally.
   */
  fixedBaseUrl?: string;
}

/**
 * Reconstructs the original URL of an incoming {@link HttpRequest}.
 */
export class OriginalUrlExtractor extends TargetExtractor {
  protected readonly logger = getLoggerFor(this);

  protected readonly identifierStrategy: IdentifierStrategy;
  protected readonly includeQueryString: boolean;
  protected readonly fixedHost?: string;

  public constructor(args: OriginalUrlExtractorArgs) {
    super();
    this.identifierStrategy = args.identifierStrategy;
    this.includeQueryString = args.includeQueryString ?? true;
    if (args.fixedBaseUrl) {
      const url = new URL(args.fixedBaseUrl);
      this.fixedHost = url.host;
      this.logger.warn([
        `The \`fixedBaseUrl\` parameter has been set `,
        `so the host header will be ignored and always assumed to be ${this.fixedHost}.`,
        `Don't use this in production.`,
      ].join(' '));
    }
  }

  public async handle({ request: { url, socket, headers }}: { request: HttpRequest }): Promise<ResourceIdentifier> {
    if (!url) {
      throw new InternalServerError('Missing URL');
    }

    // Extract host and protocol (possibly overridden by the Forwarded/X-Forwarded-* header)
    let { host } = headers;
    let protocol = (socket as TLSSocket)?.encrypted ? 'https' : 'http';

    // Check Forwarded/X-Forwarded-* headers
    const forwarded = parseForwarded(headers);
    if (forwarded.host) {
      ({ host } = forwarded);
    }
    if (forwarded.proto) {
      ({ proto: protocol } = forwarded);
    }
    if (this.fixedHost) {
      host = this.fixedHost;
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
