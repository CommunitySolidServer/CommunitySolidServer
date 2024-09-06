import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Size } from './Size';

/**
 * A SizeReporter's only purpose (at the moment) is to calculate the size
 * of a resource. How the size is calculated or what unit it is in is defined by
 * the class implementing this interface.
 * One might use the amount of bytes and another might use the amount of triples
 * stored in a resource.
 */
export interface SizeReporter<T> {

  /**
   * Get the unit as a string in which a SizeReporter returns data
   */
  getUnit: () => string;

  /**
   * Get the size of a given resource
   *
   * @param identifier - the resource of which you want the size
   *
   * @returns The size of the resource as a Size object calculated recursively
   * if the identifier leads to a container
   */
  getSize: (identifier: ResourceIdentifier) => Promise<Size>;

  /**
   * Calculate the size of a chunk based on which SizeReporter is being used
   *
   * @param chunk - the chunk of which you want the size
   *
   * @returns the size of the passed chunk as a number
   */
  calculateChunkSize: (chunk: T) => Promise<number>;

  /**
   * Estimate the size of a body / request by looking at its metadata
   *
   * @param metadata - the metadata of the resource you want an estimated  size of
   *
   * @returns the estimated size of the body / request or undefined if no
   * meaningful estimation can be made
   */
  estimateSize: (metadata: RepresentationMetadata) => Promise<number | undefined>;
}
