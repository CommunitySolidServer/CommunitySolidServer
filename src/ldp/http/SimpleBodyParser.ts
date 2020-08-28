import { HttpRequest } from '../../server/HttpRequest';
import { DATA_TYPE_BINARY } from '../../util/ContentTypes';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { BinaryRepresentation } from '../representation/BinaryRepresentation';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';
import { BodyParser } from './BodyParser';

/**
 * Converts incoming {@link HttpRequest} to a Representation without any further parsing.
 * Naively parses the mediatype from the content-type header.
 * Metadata is not generated (yet).
 */
export class SimpleBodyParser extends BodyParser {
  public async canHandle(): Promise<void> {
    // Default BodyParser supports all content-types
  }

  // Note that the only reason this is a union is in case the body is empty.
  // If this check gets moved away from the BodyParsers this union could be removed
  public async handle(input: HttpRequest): Promise<BinaryRepresentation | undefined> {
    if (!input.headers['content-type']) {
      return;
    }

    return {
      dataType: DATA_TYPE_BINARY,
      data: input,
      metadata: this.parseMetadata(input),
    };
  }

  private parseMetadata(input: HttpRequest): RepresentationMetadata {
    const mediaType = input.headers['content-type']!.split(';')[0];

    const metadata: RepresentationMetadata = {
      raw: [],
      contentType: mediaType,
    };

    const { link, slug } = input.headers;

    if (slug) {
      if (Array.isArray(slug)) {
        throw new UnsupportedHttpError('At most 1 slug header is allowed.');
      }
      metadata.slug = slug;
    }

    // There are similarities here to Accept header parsing so that library should become more generic probably
    if (link) {
      metadata.linkRel = {};
      const linkArray = Array.isArray(link) ? link : [ link ];
      const parsedLinks = linkArray.map((entry): { url: string; rel: string } => {
        const [ , url, rest ] = /^<([^>]*)>(.*)$/u.exec(entry) ?? [];
        const [ , rel ] = /^ *; *rel="(.*)"$/u.exec(rest) ?? [];
        return { url, rel };
      });
      parsedLinks.forEach((entry): void => {
        if (entry.rel) {
          if (!metadata.linkRel![entry.rel]) {
            metadata.linkRel![entry.rel] = new Set();
          }
          metadata.linkRel![entry.rel].add(entry.url);
        }
      });
    }

    return metadata;
  }
}
