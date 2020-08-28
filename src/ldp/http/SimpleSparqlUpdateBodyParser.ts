import { PassThrough } from 'stream';
import { translate } from 'sparqlalgebrajs';
import { HttpRequest } from '../../server/HttpRequest';
import { DATA_TYPE_BINARY } from '../../util/ContentTypes';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import { readableToString } from '../../util/Util';
import { BodyParser } from './BodyParser';
import { SparqlUpdatePatch } from './SparqlUpdatePatch';

/**
 * {@link BodyParser} that supports `application/sparql-update` content.
 * Will convert the incoming update string to algebra in a {@link SparqlUpdatePatch}.
 * Simple since metadata parsing is not yet implemented.
 */
export class SimpleSparqlUpdateBodyParser extends BodyParser {
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

      // Prevent body from being requested again
      return {
        algebra,
        dataType: DATA_TYPE_BINARY,
        data: dataCopy,
        metadata: {
          raw: [],
          profiles: [],
          contentType: 'application/sparql-update',
        },
      };
    } catch (error) {
      throw new UnsupportedHttpError(error);
    }
  }
}
