import { PassThrough } from 'stream';
import type { Algebra } from 'sparqlalgebrajs';
import { translate } from 'sparqlalgebrajs';
import { APPLICATION_SPARQL_UPDATE } from '../../util/ContentTypes';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import { pipeStreamsAndErrors, readableToString } from '../../util/Util';
import type { BodyParserArgs } from './BodyParser';
import { BodyParser } from './BodyParser';
import type { SparqlUpdatePatch } from './SparqlUpdatePatch';

/**
 * {@link BodyParser} that supports `application/sparql-update` content.
 * Will convert the incoming update string to algebra in a {@link SparqlUpdatePatch}.
 */
export class SparqlUpdateBodyParser extends BodyParser {
  public async canHandle({ request }: BodyParserArgs): Promise<void> {
    if (request.headers['content-type'] !== APPLICATION_SPARQL_UPDATE) {
      throw new UnsupportedMediaTypeHttpError('This parser only supports SPARQL UPDATE data.');
    }
  }

  public async handle({ request, metadata }: BodyParserArgs): Promise<SparqlUpdatePatch> {
    // Note that readableObjectMode is only defined starting from Node 12
    // It is impossible to check if object mode is enabled in Node 10 (without accessing private variables)
    const options = { objectMode: request.readableObjectMode };
    const toAlgebraStream = new PassThrough(options);
    const dataCopy = new PassThrough(options);
    pipeStreamsAndErrors(request, toAlgebraStream);
    pipeStreamsAndErrors(request, dataCopy);
    let algebra: Algebra.Operation;
    try {
      const sparql = await readableToString(toAlgebraStream);
      algebra = translate(sparql, { quads: true });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new UnsupportedHttpError(error.message);
      }
      throw new UnsupportedHttpError();
    }

    // Prevent body from being requested again
    return {
      algebra,
      binary: true,
      data: dataCopy,
      metadata,
    };
  }
}
