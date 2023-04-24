import type { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
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
   * @param metadata - Metadata of the representation. Undefined if the resource does not exist.
   * @param strict - How to compare the ETag related headers.
   *                 If true, exact string matching will be used to compare with the ETag for the given metadata.
   *                 If false, it will take into account that content negotiation might still happen
   *                 which can change the ETag.
   */
  matchesMetadata: (metadata?: RepresentationMetadata, strict?: boolean) => boolean;
}

/**
 * Generates an ETag based on the last modified date of a resource.
 * @param metadata - Metadata of the resource.
 *
 * @returns the generated ETag. Undefined if no last modified date was found.
 */
export function getETag(metadata: RepresentationMetadata): string | undefined {
  const modified = metadata.get(DC.terms.modified);
  const { contentType } = metadata;
  if (modified) {
    const date = new Date(modified.value);
    // It is possible for the content type to be undefined,
    // such as when only the metadata returned by a `DataAccessor` is used.
    return `"${date.getTime()}-${contentType ?? ''}"`;
  }
}

/**
 * Validates whether 2 ETags correspond to the same state of a resource,
 * independent of the representation the ETags correspond to.
 * Assumes ETags are made with the {@link getETag} function.
 */
export function sameResourceState(eTag1: string, eTag2: string): boolean {
  // Since we base the ETag on the last modified date,
  // we know the ETags match as long as the date part is the same.
  return eTag1.split('-')[0] === eTag2.split('-')[0];
}
