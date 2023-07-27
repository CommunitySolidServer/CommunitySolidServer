import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { DC } from '../../util/Vocabularies';
import type { Conditions } from './Conditions';
import type { ETagHandler } from './ETagHandler';

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
  protected readonly eTagHandler: ETagHandler;

  public readonly matchesETag?: string[];
  public readonly notMatchesETag?: string[];
  public readonly modifiedSince?: Date;
  public readonly unmodifiedSince?: Date;

  public constructor(eTagHandler: ETagHandler, options: BasicConditionsOptions) {
    this.eTagHandler = eTagHandler;

    this.matchesETag = options.matchesETag;
    this.notMatchesETag = options.notMatchesETag;
    this.modifiedSince = options.modifiedSince;
    this.unmodifiedSince = options.unmodifiedSince;
  }

  public matchesMetadata(metadata?: RepresentationMetadata, strict?: boolean): boolean {
    if (!metadata) {
      // RFC7232: ...If-Match... If the field-value is "*", the condition is false if the origin server
      // does not have a current representation for the target resource.
      return !this.matchesETag?.includes('*');
    }

    // RFC7232: ...If-None-Match... If the field-value is "*", the condition is false if the origin server
    // has a current representation for the target resource.
    if (this.notMatchesETag?.includes('*')) {
      return false;
    }

    const eTagMatches = (tag: string): boolean => this.eTagHandler.matchesETag(metadata, tag, Boolean(strict));
    if (this.matchesETag && !this.matchesETag.includes('*') && !this.matchesETag.some(eTagMatches)) {
      return false;
    }
    if (this.notMatchesETag?.some(eTagMatches)) {
      return false;
    }

    // In practice, this will only be undefined on a backend
    // that doesn't store the modified date.
    const modified = metadata.get(DC.terms.modified);
    if (modified) {
      const modifiedDate = new Date(modified.value);
      if (this.modifiedSince && modifiedDate < this.modifiedSince) {
        return false;
      }
      if (this.unmodifiedSince && modifiedDate > this.unmodifiedSince) {
        return false;
      }
    }

    return true;
  }
}
