import type { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { DC } from '../util/Vocabularies';

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
   * @param metadata - Metadata of the representation.
   */
  matchesMetadata: (metadata: RepresentationMetadata) => boolean;
  /**
   * Checks validity based on the given ETag and/or date.
   * @param eTag - Condition based on ETag.
   * @param lastModified - Condition based on last modified date.
   */
  matches: (eTag?: string, lastModified?: Date) => boolean;
}

/**
 * Generates an ETag based on the last modified date of a resource.
 * @param metadata - Metadata of the resource.
 *
 * @returns the generated ETag. Undefined if no last modified date was found.
 */
export function getETag(metadata: RepresentationMetadata): string | undefined {
  const modified = metadata.get(DC.terms.modified);
  if (modified) {
    const date = new Date(modified.value);
    return `"${date.getTime()}"`;
  }
}
