import { BinaryRepresentation } from '../representation/BinaryRepresentation';
import { BodyParser } from './BodyParser';
import { DATA_TYPE_BINARY } from '../../util/ContentTypes';
import { HttpRequest } from '../../server/HttpRequest';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';

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
    const contentType = input.headers['content-type'];

    if (!contentType) {
      return;
    }

    const mediaType = contentType.split(';')[0];

    const metadata: RepresentationMetadata = {
      raw: [],
      profiles: [],
      contentType: mediaType,
    };

    return {
      dataType: DATA_TYPE_BINARY,
      data: input,
      metadata,
    };
  }
}
