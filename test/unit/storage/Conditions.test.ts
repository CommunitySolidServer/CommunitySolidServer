import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { getETag, isCurrentETag } from '../../../src/storage/Conditions';
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

    it('returns undefined if no date or content-type was found.', async(): Promise<void> => {
      const now = new Date();
      expect(getETag(new RepresentationMetadata())).toBeUndefined();
      expect(getETag(new RepresentationMetadata({ [DC.modified]: now.toISOString() }))).toBeUndefined();
      expect(getETag(new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' }))).toBeUndefined();
    });
  });

  describe('#isCurrentETag', (): void => {
    const now = new Date();

    it('compares an ETag with the current resource state.', async(): Promise<void> => {
      const metadata = new RepresentationMetadata({
        [DC.modified]: now.toISOString(),
        [CONTENT_TYPE]: 'text/turtle',
      });
      const eTag = getETag(metadata)!;
      expect(isCurrentETag(eTag, metadata)).toBe(true);
      expect(isCurrentETag('"ETag"', metadata)).toBe(false);
    });

    it('ignores the content-type.', async(): Promise<void> => {
      const metadata = new RepresentationMetadata({
        [DC.modified]: now.toISOString(),
        [CONTENT_TYPE]: 'text/turtle',
      });
      const eTag = getETag(metadata)!;
      metadata.contentType = 'application/ld+json';
      expect(isCurrentETag(eTag, metadata)).toBe(true);
      expect(isCurrentETag('"ETag"', metadata)).toBe(false);
    });

    it('returns false if the metadata has no last modified date.', async(): Promise<void> => {
      const metadata = new RepresentationMetadata();
      expect(isCurrentETag('"ETag"', metadata)).toBe(false);
    });
  });
});
