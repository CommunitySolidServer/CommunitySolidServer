import { DataFactory } from 'n3';
import { HTTP } from '../../../util/UriConstants';
import { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../representation/ResourceIdentifier';
import { ResponseDescription } from './ResponseDescription';

/**
 * Corresponds to a 201 response, containing the relevant link metadata.
 */
export class CreatedResponseDescription extends ResponseDescription {
  public constructor(location: ResourceIdentifier) {
    const metadata = new RepresentationMetadata({ [HTTP.location]: DataFactory.namedNode(location.path) });
    super(201, metadata);
  }
}
