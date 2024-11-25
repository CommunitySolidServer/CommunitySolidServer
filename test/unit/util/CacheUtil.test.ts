import { Readable } from 'node:stream';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import {
  cachedToRepresentation,
  calculateCachedRepresentationSize,
  duplicateRepresentation,
  readStream,
  representationToCached,
} from '../../../src/util/CacheUtil';
import { readableToString } from '../../../src/util/StreamUtil';
import { CONTENT_TYPE } from '../../../src/util/Vocabularies';

describe('CacheUtil', (): void => {
  describe('#calculateCachedRepresentationSize', (): void => {
    it('returns the length of the data + 1.', async(): Promise<void> => {
      expect(calculateCachedRepresentationSize({ data: [ 1, 2 ], metadata: new RepresentationMetadata() })).toBe(3);
    });
  });

  describe('#readStream', (): void => {
    it('converts object streams to arrays.', async(): Promise<void> => {
      await expect(readStream(Readable.from([ 1, 2, 3 ]))).resolves.toEqual([ 1, 2, 3 ]);
    });

    it('reads streams into a Buffer.', async(): Promise<void> => {
      await expect(readStream(Readable.from('pear', { objectMode: false })))
        .resolves.toEqual(Buffer.from('pear'));
    });

    it('reads string streams into a Buffer.', async(): Promise<void> => {
      await expect(readStream(Readable.from('pear', { objectMode: false, encoding: 'utf8' })))
        .resolves.toEqual(Buffer.from('pear'));
    });
  });

  describe('#cachedToRepresentation', (): void => {
    it('returns a representation containing a copy of the stored data.', async(): Promise<void> => {
      const data = Buffer.from('pear');
      const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/plain' });
      const result = cachedToRepresentation({ data, metadata });
      expect(result.metadata.contentType).toBe('text/plain');
      await expect(readableToString(result.data)).resolves.toBe('pear');
      result.metadata.contentType = 'text/turtle';
      // Did not change the original metadata
      expect(metadata.contentType).toBe('text/plain');
    });
  });

  describe('#representationToCached', (): void => {
    it('caches a representation and returns a copy that can still be used.', async(): Promise<void> => {
      const representation = new BasicRepresentation('pear', 'text/plain');
      const cached = await representationToCached(representation);
      expect(cached).toBeDefined();

      expect(cached!.data).toEqual([ 'pear' ]);
      expect(cached!.metadata.contentType).toBe('text/plain');

      // Changing content type to make sure original version doesn't change
      cached!.metadata.contentType = 'text/turtle';
      expect(representation.metadata.contentType).toBe('text/plain');
    });

    it('returns undefined if there was an error when reading the stream.', async(): Promise<void> => {
      const representation = new BasicRepresentation('pear', 'text/plain');
      representation.data.destroy(new Error('bad data'));
      await expect(representationToCached(representation)).resolves.toBeUndefined();
    });
  });

  describe('#duplicateRepresentation', (): void => {
    it('duplicates a representation.', async(): Promise<void> => {
      const representation = new BasicRepresentation('test', 'text/plain');
      const [ copy1, copy2 ] = duplicateRepresentation(representation);
      await expect(readableToString(copy1.data)).resolves.toBe('test');
      await expect(readableToString(copy2.data)).resolves.toBe('test');
      expect(copy1.metadata.contentType).toBe('text/plain');
      expect(copy2.metadata.contentType).toBe('text/plain');

      // Make sure these are distinct metadata objects
      copy1.metadata.contentType = 'text/turtle';
      copy2.metadata.contentType = 'text/n3';

      expect(representation.metadata.contentType).toBe('text/plain');
      expect(copy1.metadata.contentType).toBe('text/turtle');
      expect(copy2.metadata.contentType).toBe('text/n3');
    });
  });
});
