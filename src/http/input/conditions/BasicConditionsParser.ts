import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import type { BasicConditionsOptions } from '../../../storage/conditions/BasicConditions';
import { BasicConditions } from '../../../storage/conditions/BasicConditions';
import type { Conditions } from '../../../storage/conditions/Conditions';
import type { ETagHandler } from '../../../storage/conditions/ETagHandler';
import { splitCommaSeparated } from '../../../util/StringUtil';
import { ConditionsParser } from './ConditionsParser';

/**
 * Creates a Conditions object based on the following headers:
 *  - If-Modified-Since
 *  - If-Unmodified-Since
 *  - If-Match
 *  - If-None-Match
 *
 * Implementation based on RFC7232
 */
export class BasicConditionsParser extends ConditionsParser {
  protected readonly logger = getLoggerFor(this);

  protected readonly eTagHandler: ETagHandler;

  public constructor(eTagHandler: ETagHandler) {
    super();
    this.eTagHandler = eTagHandler;
  }

  public async handle(request: HttpRequest): Promise<Conditions | undefined> {
    const options: BasicConditionsOptions = {
      matchesETag: this.parseTagHeader(request, 'if-match'),
      notMatchesETag: this.parseTagHeader(request, 'if-none-match'),
    };

    // A recipient MUST ignore If-Modified-Since if the request contains an If-None-Match header field
    // A recipient MUST ignore the If-Modified-Since header field ... if the request method is neither GET nor HEAD.
    if (!options.notMatchesETag && (request.method === 'GET' || request.method === 'HEAD')) {
      options.modifiedSince = this.parseDateHeader(request, 'if-modified-since');
    }

    // A recipient MUST ignore If-Unmodified-Since if the request contains an If-Match header field
    if (!options.matchesETag) {
      options.unmodifiedSince = this.parseDateHeader(request, 'if-unmodified-since');
    }

    // Only return a Conditions object if there is at least one condition; undefined otherwise
    this.logger.debug(`Found the following conditions: ${JSON.stringify(options)}`);
    if (Object.values(options).some((val): boolean => typeof val !== 'undefined')) {
      return new BasicConditions(this.eTagHandler, options);
    }
  }

  /**
   * Converts a request header containing a datetime string to an actual Date object.
   * Undefined if there is no value for the given header name.
   */
  private parseDateHeader(request: HttpRequest, header: 'if-modified-since' | 'if-unmodified-since'): Date | undefined {
    const headerVal = request.headers[header];
    if (headerVal) {
      const timestamp = Date.parse(headerVal);
      return Number.isNaN(timestamp) ? undefined : new Date(timestamp);
    }
  }

  /**
   * Converts a request header containing ETags to an array of ETags.
   * Undefined if there is no value for the given header name.
   */
  private parseTagHeader(request: HttpRequest, header: 'if-match' | 'if-none-match'): string[] | undefined {
    const headerValue = request.headers[header];
    if (headerValue) {
      return splitCommaSeparated(headerValue.trim());
    }
  }
}
