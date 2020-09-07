import { PassThrough } from 'stream';
import { translate } from 'sparqlalgebrajs';
import { HttpRequest } from '../../server/HttpRequest';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import { CONTENT_TYPE } from '../../util/MetadataTypes';
import { readableToString } from '../../util/Util';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';
import { BodyParser } from './BodyParser';
import { SparqlUpdatePatch } from './SparqlUpdatePatch';

/**
 * {@link BodyParser} that supports `application/sparql-update` content.
 * Will convert the incoming update string to algebra in a {@link SparqlUpdatePatch}.
 * Still needs access to a handler for parsing metadata.
 */
export class SparqlUpdateBodyParser extends BodyParser {
  public async canHandle(input: HttpRequest): Promise<void> {
    const contentType = input.headers['content-type'];

    if (!contentType || contentType !== 'application/sparql-update') {
      throw new UnsupportedMediaTypeHttpError('This parser only supports SPARQL UPDATE data.');
    }
  }

  public async handle(input: HttpRequest): Promise<SparqlUpdatePatch> {
    try {
      // Note that readableObjectMode is only defined starting from Node 12
      // It is impossible to check if object mode is enabled in Node 10 (without accessing private variables)
      const options = { objectMode: input.readableObjectMode };
      const toAlgebraStream = new PassThrough(options);
      const dataCopy = new PassThrough(options);
      input.pipe(toAlgebraStream);
      input.pipe(dataCopy);
      const sparql = await readableToString(toAlgebraStream);
      const algebra = translate(sparql, { quads: true });

      const metadata = new RepresentationMetadata();
      metadata.add(CONTENT_TYPE, 'application/sparql-update');

      // Prevent body from being requested again
      return {
        algebra,
        binary: true,
        data: dataCopy,
        metadata,
      };
    } catch (error) {
      throw new UnsupportedHttpError(error);
    }
  }
}
