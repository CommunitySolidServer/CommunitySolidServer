import { BasicRepresentation } from '../../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../../src/ldp/representation/Representation';
import * as resourceUtils from '../../../src/util/ResourceUtil';
import 'jest-rdf';

describe('ResourceUtil', (): void => {
  let representation: Representation;

  beforeEach(async(): Promise<void> => {
    representation = new BasicRepresentation('data', 'metadata');
  });

  describe('cloneRepresentation', (): void => {
    it('returns a clone of the passed representation.', async(): Promise<void> => {
      const res = await resourceUtils.cloneRepresentation(representation);
      expect(res.binary).toBe(representation.binary);
      expect(res.metadata.identifier).toBe(representation.metadata.identifier);
      expect(res.metadata.contentType).toBe(representation.metadata.contentType);
    });

    it('ensures that original representation does not update when the clone is updated.', async(): Promise<void> => {
      const res = await resourceUtils.cloneRepresentation(representation);
      res.metadata.contentType = 'typetype';
      expect(representation.metadata.contentType).not.toBe(res.metadata.contentType);
    });
  });
});
