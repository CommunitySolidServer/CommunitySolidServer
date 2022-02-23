import { DataFactory } from 'n3';
import type { RedirectHttpError } from '../../../util/errors/RedirectHttpError';
import { SOLID_HTTP } from '../../../util/Vocabularies';
import { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { ResponseDescription } from './ResponseDescription';

/**
 * Corresponds to a redirect response, containing the relevant location metadata.
 */
export class RedirectResponseDescription extends ResponseDescription {
  public constructor(error: RedirectHttpError) {
    const metadata = new RepresentationMetadata({ [SOLID_HTTP.location]: DataFactory.namedNode(error.location) });
    super(error.statusCode, metadata);
  }
}
