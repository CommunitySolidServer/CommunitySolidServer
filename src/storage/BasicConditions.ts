import type { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { DC } from '../util/Vocabularies';
import { getETag } from './Conditions';
import type { Conditions } from './Conditions';

export interface BasicConditionsOptions {
  matchesETag?: string[];
  notMatchesETag?: string[];
  modifiedSince?: Date;
  unmodifiedSince?: Date;
}

/**
 * Stores all the relevant Conditions values and matches them based on RFC7232.
 */
export class BasicConditions implements Conditions {
  public readonly matchesETag?: string[];
  public readonly notMatchesETag?: string[];
  public readonly modifiedSince?: Date;
  public readonly unmodifiedSince?: Date;

  public constructor(options: BasicConditionsOptions) {
    this.matchesETag = options.matchesETag;
    this.notMatchesETag = options.notMatchesETag;
    this.modifiedSince = options.modifiedSince;
    this.unmodifiedSince = options.unmodifiedSince;
  }

  public matchesMetadata(metadata?: RepresentationMetadata): boolean {
    if (!metadata) {
      // RFC7232: ...If-Match... If the field-value is "*", the condition is false if the origin server
      // does not have a current representation for the target resource.
      return !this.matchesETag?.includes('*');
    }

    const modified = metadata.get(DC.terms.modified);
    const modifiedDate = modified ? new Date(modified.value) : undefined;
    const etag = getETag(metadata);
    return this.matches(etag, modifiedDate);
  }

  public matches(eTag?: string, lastModified?: Date): boolean {
    // RFC7232: ...If-None-Match... If the field-value is "*", the condition is false if the origin server
    // has a current representation for the target resource.
    if (this.notMatchesETag?.includes('*')) {
      return false;
    }

    if (eTag) {
      if (this.matchesETag && !this.matchesETag.includes(eTag) && !this.matchesETag.includes('*')) {
        return false;
      }
      if (this.notMatchesETag?.includes(eTag)) {
        return false;
      }
    }

    if (lastModified) {
      if (this.modifiedSince && lastModified < this.modifiedSince) {
        return false;
      }
      if (this.unmodifiedSince && lastModified > this.unmodifiedSince) {
        return false;
      }
    }

    return true;
  }
}
