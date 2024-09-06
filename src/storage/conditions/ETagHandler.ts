import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';

/**
 * Responsible for everything related to ETag generation and comparison.
 * ETags are constructed in such a way they can both be used for the standard ETag usage of comparing representations,
 * but also to see if two ETags of different representations correspond to the same resource state.
 */
export interface ETagHandler {
  /**
   * Generates an ETag for the given metadata. Returns undefined if no ETag could be generated.
   *
   * @param metadata - Metadata of the representation to generate an ETag for.
   */
  getETag: (metadata: RepresentationMetadata) => string | undefined;

  /**
   * Validates whether the given metadata corresponds to the given ETag.
   *
   * @param metadata - Metadata of the resource.
   * @param eTag - ETag to compare to.
   * @param strict - True if the comparison needs to be on representation level.
   *                 False if it is on resource level and the content-type doesn't matter.
   */
  matchesETag: (metadata: RepresentationMetadata, eTag: string, strict: boolean) => boolean;

  /**
   * Validates whether 2 ETags correspond to the same state of a resource,
   * independent of the representation the ETags correspond to.
   *
   * @param eTag1 - First ETag to compare.
   * @param eTag2 - Second ETag to compare.
   */
  sameResourceState: (eTag1: string, eTag2: string) => boolean;
}
