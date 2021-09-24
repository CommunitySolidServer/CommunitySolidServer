import type { Readable } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { Size } from '../size-reporter/size.model';

/**
 * A QuotaStrategy is used when we want to set a limit to the amount of data that can be
 * stored on the server.
 * This can range from a limit for the whole server to a limit on a per pod basis.
 * The way the size of a resource is calculated is implemented by the implementing classes.
 * This can be bytes, quads, file count, ...
 */
export interface QuotaStrategy {

  /**
   * Get the available space given a resource's identifier
   *
   * @param identifier - the identifier of the resource of which you want the available space
   * @returns the available space and the unit of the space as a Size object
   */
  getAvailableSpace: (identifier: ResourceIdentifier) => Size;

  /**
   * Get an estimated size of the resource
   *
   * @param metadata - the metadata that might include
   * @returns a Size object containing the estimated size and unit of the resource
   */
  estimateSize: (metadata: RepresentationMetadata) => Size;

  /**
   * Track the available space depending on the data stream that was given.
   * On every data event of the stream, the returned stream will push data containing
   * a number representing the amount on space left.
   *
   * @param identifier - the identifier of the resource in question
   * @param data - the Readable stream that belongs to the identifier
   * @param metadata - the RepresentationMetadata that belongs to the identifier
   * @returns a readable stream that pushes the available space in numbers
   */
  trackAvailableSpace: (
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ) => Guarded<Readable>;

}
