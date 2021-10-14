import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { getETag } from '../../../src/storage/Conditions';
import { DC } from '../../../src/util/Vocabularies';

describe('Conditions', (): void => {
  describe('#getETag', (): void => {
    it('creates an ETag based on the date last modified.', async(): Promise<void> => {
      const now = new Date();
      const metadata = new RepresentationMetadata({ [DC.modified]: now.toISOString() });
      expect(getETag(metadata)).toBe(`"${now.getTime()}"`);
    });

    it('returns undefined if no date was found.', async(): Promise<void> => {
      expect(getETag(new RepresentationMetadata())).toBeUndefined();
    });
  });
});
