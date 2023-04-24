import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { getETag, sameResourceState } from '../../../src/storage/Conditions';
import { CONTENT_TYPE, DC } from '../../../src/util/Vocabularies';

describe('Conditions', (): void => {
  describe('#getETag', (): void => {
    it('creates an ETag based on the date last modified and content-type.', async(): Promise<void> => {
      const now = new Date();
      const metadata = new RepresentationMetadata({
        [DC.modified]: now.toISOString(),
        [CONTENT_TYPE]: 'text/turtle',
      });
      expect(getETag(metadata)).toBe(`"${now.getTime()}-text/turtle"`);
    });

    it('creates a simpler ETag if no content type was found.', async(): Promise<void> => {
      const now = new Date();
      expect(getETag(new RepresentationMetadata({ [DC.modified]: now.toISOString() }))).toBe(`"${now.getTime()}-"`);
    });

    it('returns undefined if no date found.', async(): Promise<void> => {
      expect(getETag(new RepresentationMetadata())).toBeUndefined();
      expect(getETag(new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' }))).toBeUndefined();
    });
  });

  describe('sameResourceState', (): void => {
    const eTag = '"123456-text/turtle"';
    const eTagJson = '"123456-application/ld+json"';
    const eTagWrongTime = '"654321-text/turtle"';

    it('returns true if the ETags are the same.', async(): Promise<void> => {
      expect(sameResourceState(eTag, eTag)).toBe(true);
    });

    it('returns true if the ETags target the same timestamp.', async(): Promise<void> => {
      expect(sameResourceState(eTag, eTagJson)).toBe(true);
    });

    it('returns false if the timestamp differs.', async(): Promise<void> => {
      expect(sameResourceState(eTag, eTagWrongTime)).toBe(false);
    });
  });
});
