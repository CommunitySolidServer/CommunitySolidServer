import type { PassThrough, Readable } from 'stream';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { Size } from '../size-reporter/Size';

/**
 * A QuotaStrategy is used when we want to set a limit to the amount of data that can be
 * stored on the server.
 * This can range from a limit for the whole server to a limit on a per pod basis.
 * The way the size of a resource is calculated is implemented by the implementing classes.
 * This can be bytes, quads, file count, ...
 */
export interface QuotaStrategy {
  /**
   * Get the available space when writing data to the given identifier.
   * If the given resource already exists it will deduct the already taken up
   * space by that resource since it is going to be overwritten and thus counts
   * as available space.
   *
   * @param identifier - the identifier of the resource of which you want the available space
   * @returns the available space and the unit of the space as a Size object
   */
  getAvailableSpace: (identifier: ResourceIdentifier) => Promise<Size>;

  /**
   * Get an estimated size of the resource
   *
   * @param metadata - the metadata that might include the size
   * @returns a Size object containing the estimated size and unit of the resource
   */
  estimateSize: (metadata: RepresentationMetadata) => Promise<Size>;

  /**
   * Get a Passthrough stream that will keep track of the available space.
   * If the quota is exceeded the stream will emit an error and destroy itself.
   * Like other Passthrough instances this will simply pass on the chunks, when the quota isn't exceeded.
   *
   * @param identifier - the identifier of the resource in question
   * @param data - the Readable stream that belongs to the identifier
   * @param metadata - the RepresentationMetadata that belongs to the identifier
   * @returns a Passthrough instance that errors when quota is exceeded
   */
  trackAvailableSpace: (identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata) =>
  Promise<Guarded<PassThrough>>;
}
