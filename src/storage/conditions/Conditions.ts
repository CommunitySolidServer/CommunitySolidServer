import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';

/**
 * The conditions of an HTTP conditional request.
 */
export interface Conditions {
  /**
   * Valid if matching any of the given ETags.
   */
  matchesETag?: string[];
  /**
   * Valid if not matching any of the given ETags.
   */
  notMatchesETag?: string[];
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
   *
   * @param metadata - Metadata of the representation. Undefined if the resource does not exist.
   * @param strict - How to compare the ETag related headers.
   *                 If true, the comparison will happen on representation level.
   *                 If false, the comparison happens on resource level, ignoring the content-type.
   */
  matchesMetadata: (metadata?: RepresentationMetadata, strict?: boolean) => boolean;
}
