import { PassThrough } from 'stream';
import type { Algebra } from 'sparqlalgebrajs';
import { translate } from 'sparqlalgebrajs';
import { getLoggerFor } from '../../logging/LogUtil';
import { APPLICATION_SPARQL_UPDATE } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import { pipeSafely, readableToString } from '../../util/StreamUtil';
import type { BodyParserArgs } from './BodyParser';
import { BodyParser } from './BodyParser';
import type { SparqlUpdatePatch } from './SparqlUpdatePatch';

/**
 * {@link BodyParser} that supports `application/sparql-update` content.
 * Will convert the incoming update string to algebra in a {@link SparqlUpdatePatch}.
 */
export class SparqlUpdateBodyParser extends BodyParser {
  protected readonly logger = getLoggerFor(this);

  public async canHandle({ request }: BodyParserArgs): Promise<void> {
    const contentType = request.headers['content-type'];
    if (contentType !== APPLICATION_SPARQL_UPDATE) {
      this.logger.debug(`Unsupported content type: ${contentType}`);
      throw new UnsupportedMediaTypeHttpError('This parser only supports SPARQL UPDATE data.');
    }
  }

  public async handle({ request, metadata }: BodyParserArgs): Promise<SparqlUpdatePatch> {
    const options = { objectMode: request.readableObjectMode };
    const toAlgebraStream = pipeSafely(request, new PassThrough(options));
    const dataCopy = pipeSafely(request, new PassThrough(options));
    let algebra: Algebra.Operation;
    try {
      const sparql = await readableToString(toAlgebraStream);
      algebra = translate(sparql, { quads: true });
    } catch (error: unknown) {
      this.logger.warn('Could not translate SPARQL query to SPARQL algebra', { error });
      if (error instanceof Error) {
        throw new BadRequestHttpError(error.message);
      }
      throw new BadRequestHttpError();
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
