import { BodyParser } from './BodyParser';
import { HttpRequest } from '../../server/HttpRequest';
import { Quad } from 'rdf-js';
import { QuadRepresentation } from '../representation/QuadRepresentation';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';
import { StreamParser } from 'n3';
import { TypedReadable } from '../../util/TypedReadable';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';

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
      return undefined;
    }

    const mediaType = contentType.split(';')[0];

    const metadata: RepresentationMetadata = {
      raw: [],
      profiles: [],
      contentType: mediaType,
    };

    // StreamParser is a Readable but typings are incorrect at time of writing
    const quads: TypedReadable<Quad> = input.pipe(new StreamParser()) as unknown as TypedReadable<Quad>;

    return {
      dataType: 'quad',
      data: quads,
      metadata,
    };
  }
}
