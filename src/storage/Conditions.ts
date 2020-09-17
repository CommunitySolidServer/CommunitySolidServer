import type { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';

/**
 * The conditions of an HTTP conditional request.
 */
export interface Conditions {
  /**
   * Valid if matching any of the given ETags.
   */
  matchesEtag: string[];
  /**
   * Valid if not matching any of the given ETags.
   */
  notMatchesEtag: string[];
  /**
   * Valid if modified since the given date.
   */
  modifiedSince?: Date;
  /**
   * Valid if not modified since the given date.
   */
  unmodifiedSince?: Date;

  /**
   * Checks validity based on the given metadata.
   * @param metadata - Metadata of the representation.
   */
  matchesMetadata: (metadata: RepresentationMetadata) => boolean;
  /**
   * Checks validity based on the given ETag and/org date.
   * @param eTag - Condition based on ETag.
   * @param lastModified - Condition based on last modified date.
   */
  matches: (eTag?: string, lastModified?: Date) => boolean;
}
