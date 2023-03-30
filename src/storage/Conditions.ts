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
  if (modified && contentType) {
    const date = new Date(modified.value);
    return `"${date.getTime()}-${contentType}"`;
  }
}

/**
 * Validates whether a given ETag corresponds to the current state of the resource,
 * independent of the representation the ETag corresponds to.
 * Assumes ETags are made with the {@link getETag} function.
 * Since we base the ETag on the last modified date,
 * we know the ETag still matches as long as that didn't change.
 *
 * @param eTag - ETag to validate.
 * @param metadata - Metadata of the resource.
 *
 * @returns `true` if the ETag represents the current state of the resource.
 */
export function isCurrentETag(eTag: string, metadata: RepresentationMetadata): boolean {
  const modified = metadata.get(DC.terms.modified);
  if (!modified) {
    return false;
  }
  const time = eTag.split('-', 1)[0];
  const date = new Date(modified.value);
  // `time` will still have the initial`"` of the ETag string
  return time === `"${date.getTime()}`;
}
