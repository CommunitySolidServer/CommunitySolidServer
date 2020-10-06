import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import type { Representation } from '../representation/Representation';
import type { BodyParserArgs } from './BodyParser';
import { BodyParser } from './BodyParser';

/**
 * Converts incoming {@link HttpRequest} to a Representation without any further parsing.
 */
export class RawBodyParser extends BodyParser {
  public async canHandle(): Promise<void> {
    // All content-types are supported
  }

  // Note that the only reason this is a union is in case the body is empty.
  // If this check gets moved away from the BodyParsers this union could be removed
  public async handle({ request, metadata }: BodyParserArgs): Promise<Representation | undefined> {
    // RFC7230, §3.3: The presence of a message body in a request
    // is signaled by a Content-Length or Transfer-Encoding header field.
    if (!request.headers['content-length'] && !request.headers['transfer-encoding']) {
      return;
    }

    // While RFC7231 allows treating a body without content type as an octet stream,
    // such an omission likely signals a mistake, so force clients to make this explicit.
    if (!request.headers['content-type']) {
      throw new UnsupportedHttpError('An HTTP request body was passed without Content-Type header');
    }

    return {
      binary: true,
      data: request,
      metadata,
    };
  }
}
