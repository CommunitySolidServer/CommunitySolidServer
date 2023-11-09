import type { Algebra } from 'sparqlalgebrajs';
import { translate } from 'sparqlalgebrajs';
import { getLoggerFor } from '../../../logging/LogUtil';
import { APPLICATION_SPARQL_UPDATE } from '../../../util/ContentTypes';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { UnsupportedMediaTypeHttpError } from '../../../util/errors/UnsupportedMediaTypeHttpError';
import { guardedStreamFrom, readableToString } from '../../../util/StreamUtil';
import type { SparqlUpdatePatch } from '../../representation/SparqlUpdatePatch';
import type { BodyParserArgs } from './BodyParser';
import { BodyParser } from './BodyParser';

/**
 * {@link BodyParser} that supports `application/sparql-update` content.
 * Will convert the incoming update string to algebra in a {@link SparqlUpdatePatch}.
 */
export class SparqlUpdateBodyParser extends BodyParser {
  protected readonly logger = getLoggerFor(this);

  public async canHandle({ metadata }: BodyParserArgs): Promise<void> {
    if (metadata.contentType !== APPLICATION_SPARQL_UPDATE) {
      throw new UnsupportedMediaTypeHttpError('This parser only supports SPARQL UPDATE data.');
    }
  }

  public async handle({ request, metadata }: BodyParserArgs): Promise<SparqlUpdatePatch> {
    const sparql = await readableToString(request);
    let algebra: Algebra.Operation;
    try {
      algebra = translate(sparql, { quads: true, baseIRI: metadata.identifier.value }) as Algebra.Update;
    } catch (error: unknown) {
      const message = createErrorMessage(error);
      this.logger.warn(`Could not translate SPARQL query to SPARQL algebra: ${message}`);
      throw new BadRequestHttpError(message, { cause: error });
    }

    // Prevent body from being requested again
    return {
      algebra,
      binary: true,
      data: guardedStreamFrom(sparql),
      metadata,
      isEmpty: false,
    };
  }
}
