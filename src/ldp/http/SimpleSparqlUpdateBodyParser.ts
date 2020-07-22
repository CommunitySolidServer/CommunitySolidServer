import { BodyParser } from './BodyParser';
import { HttpRequest } from '../../server/HttpRequest';
import { Readable } from 'stream';
import { readableToString } from '../../util/Util';
import { SparqlUpdatePatch } from './SparqlUpdatePatch';
import { translate } from 'sparqlalgebrajs';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';

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
      const sparql = await readableToString(input);
      const algebra = translate(sparql, { quads: true });

      // Prevent body from being requested again
      return {
        algebra,
        dataType: 'sparql-algebra',
        raw: sparql,
        get data(): Readable {
          throw new Error('Body already parsed');
        },
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
