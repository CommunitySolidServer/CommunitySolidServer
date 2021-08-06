import { DataFactory } from 'n3';
import { SOLID_HTTP } from '../../../util/Vocabularies';
import { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../representation/ResourceIdentifier';
import { ResponseDescription } from './ResponseDescription';

/**
 * Corresponds to a 201 response, containing the relevant location metadata.
 */
export class CreatedResponseDescription extends ResponseDescription {
  public constructor(location: ResourceIdentifier) {
    const metadata = new RepresentationMetadata({ [SOLID_HTTP.location]: DataFactory.namedNode(location.path) });
    super(201, metadata);
  }
}
