import { BodyParser } from './BodyParser';
import { HttpRequest } from '../../server/HttpRequest';
import { PassThrough } from 'stream';
import { QuadRepresentation } from '../representation/QuadRepresentation';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';
import { StreamParser } from 'n3';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';

/**
 * Parses the incoming {@link HttpRequest} if there is no body or if it contains turtle (or similar) RDF data.
 * Naively parses the content-type header to determine the body type.
 */
export class SimpleBodyParser extends BodyParser {
  private static readonly contentTypes = [
    'application/n-quads',
    'application/trig',
    'application/n-triples',
    'text/turtle',
    'text/n3',
  ];

  public async canHandle(input: HttpRequest): Promise<void> {
    const contentType = input.headers['content-type'];

    if (contentType && !SimpleBodyParser.contentTypes.some((type): boolean => contentType.includes(type))) {
      throw new UnsupportedMediaTypeHttpError('This parser only supports RDF data.');
    }
  }

  public async handle(input: HttpRequest): Promise<QuadRepresentation> {
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

    // Catch parsing errors and emit correct error
    // Node 10 requires both writableObjectMode and readableObjectMode
    const errorStream = new PassThrough({ writableObjectMode: true, readableObjectMode: true });
    const data = input.pipe(new StreamParser());
    data.pipe(errorStream);
    data.on('error', (error): boolean => errorStream.emit('error', new UnsupportedHttpError(error.message)));

    return {
      dataType: 'quad',
      data: errorStream,
      metadata,
    };
  }
}
