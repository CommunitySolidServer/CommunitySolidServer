import type { HttpRequest } from '../../server/HttpRequest';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { CONTENT_TYPE, HTTP, RDF } from '../../util/UriConstants';
import type { Representation } from '../representation/Representation';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';
import { BodyParser } from './BodyParser';

/**
 * Converts incoming {@link HttpRequest} to a Representation without any further parsing.
 * Naively parses the mediatype from the content-type header.
 * Some other metadata is also generated, but this should probably be done in an external handler.
 */
export class RawBodyParser extends BodyParser {
  public async canHandle(): Promise<void> {
    // All content-types are supported
  }

  // Note that the only reason this is a union is in case the body is empty.
  // If this check gets moved away from the BodyParsers this union could be removed
  public async handle(input: HttpRequest): Promise<Representation | undefined> {
    // RFC7230, §3.3: The presence of a message body in a request
    // is signaled by a Content-Length or Transfer-Encoding header field.
    if (!input.headers['content-length'] && !input.headers['transfer-encoding']) {
      return;
    }

    // While RFC7231 allows treating a body without content type as an octet stream,
    // such an omission likely signals a mistake, so force clients to make this explicit.
    if (!input.headers['content-type']) {
      throw new Error('An HTTP request body was passed without Content-Type header');
    }

    return {
      binary: true,
      data: input,
      metadata: this.parseMetadata(input),
    };
  }

  private parseMetadata(input: HttpRequest): RepresentationMetadata {
    const contentType = /^[^;]*/u.exec(input.headers['content-type']!)![0];

    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: contentType });

    const { link, slug } = input.headers;

    if (slug) {
      if (Array.isArray(slug)) {
        throw new UnsupportedHttpError('At most 1 slug header is allowed.');
      }
      metadata.set(HTTP.slug, slug);
    }

    // There are similarities here to Accept header parsing so that library should become more generic probably
    if (link) {
      const linkArray = Array.isArray(link) ? link : [ link ];
      const parsedLinks = linkArray.map((entry): { url: string; rel: string } => {
        const [ , url, rest ] = /^<([^>]*)>(.*)$/u.exec(entry) ?? [];
        const [ , rel ] = /^ *; *rel="(.*)"$/u.exec(rest) ?? [];
        return { url, rel };
      });
      for (const entry of parsedLinks) {
        if (entry.rel === 'type') {
          metadata.set(RDF.type, entry.url);
          break;
        }
      }
    }

    return metadata;
  }
}
