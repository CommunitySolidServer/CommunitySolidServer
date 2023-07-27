import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { DC } from '../../util/Vocabularies';
import type { ETagHandler } from './ETagHandler';

/**
 * Standard implementation of {@link ETagHandler}.
 * ETags are constructed by combining the last modified date with the content type of the representation.
 */
export class BasicETagHandler implements ETagHandler {
  public getETag(metadata: RepresentationMetadata): string | undefined {
    const modified = metadata.get(DC.terms.modified);
    const { contentType } = metadata;
    if (modified && contentType) {
      const date = new Date(modified.value);
      return `"${date.getTime()}-${contentType}"`;
    }
  }

  public matchesETag(metadata: RepresentationMetadata, eTag: string, strict: boolean): boolean {
    const modified = metadata.get(DC.terms.modified);
    if (!modified) {
      return false;
    }
    const date = new Date(modified.value);
    const { contentType } = metadata;

    // Slicing of the double quotes
    const [ eTagTimestamp, eTagContentType ] = eTag.slice(1, -1).split('-');

    return eTagTimestamp === `${date.getTime()}` && (!strict || eTagContentType === contentType);
  }

  public sameResourceState(eTag1: string, eTag2: string): boolean {
    // Since we base the ETag on the last modified date,
    // we know the ETags match as long as the date part is the same.
    return eTag1.split('-')[0] === eTag2.split('-')[0];
  }
}
