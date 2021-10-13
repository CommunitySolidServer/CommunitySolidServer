import 'jest-rdf';
import type { Readable } from 'stream';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { AtomicFileDataAccessor } from '../../../../src/storage/accessors/AtomicFileDataAccessor';
import { ExtensionBasedMapper } from '../../../../src/storage/mapping/ExtensionBasedMapper';
import { APPLICATION_OCTET_STREAM } from '../../../../src/util/ContentTypes';
import type { Guarded } from '../../../../src/util/GuardedStream';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';
import { CONTENT_TYPE } from '../../../../src/util/Vocabularies';
import { mockFs } from '../../../util/Util';

jest.mock('fs');

describe('AtomicFileDataAccessor', (): void => {
  const rootFilePath = 'uploads';
  const base = 'http://test.com/';
  let accessor: AtomicFileDataAccessor;
  let cache: { data: any };
  let metadata: RepresentationMetadata;
  let data: Guarded<Readable>;

  beforeEach(async(): Promise<void> => {
    cache = mockFs(rootFilePath, new Date());
    accessor = new AtomicFileDataAccessor(
      new ExtensionBasedMapper(base, rootFilePath),
      rootFilePath,
      '../.internal/tempFiles/',
    );
    (accessor as any).tempFilePath = rootFilePath;
    metadata = new RepresentationMetadata(APPLICATION_OCTET_STREAM);
    data = guardedStreamFrom([ 'data' ]);
  });

  describe('writing a document', (): void => {
    it('writes the data to the corresponding file.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      expect(cache.data.resource).toBe('data');
    });

    it('writes metadata to the corresponding metadata file.', async(): Promise<void> => {
      metadata = new RepresentationMetadata({ path: `${base}res.ttl` },
        { [CONTENT_TYPE]: 'text/turtle', likes: 'apples' });
      await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).resolves.toBeUndefined();
      expect(cache.data['res.ttl']).toBe('data');
      expect(cache.data['res.ttl.meta']).toMatch(`<${base}res.ttl> <likes> "apples".`);
    });

    it('should delete temp file when done writing.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      expect(Object.keys(cache.data)).toHaveLength(1);
    });

    it('should throw an error when writing the data goes wrong.', async(): Promise<void> => {
      data.read = (): any => {
        data.emit('error', new Error('error'));
        return null;
      };
      await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).rejects.toThrow();
    });

    it('should throw when renameing / moving the file goes wrong.', async(): Promise<void> => {
      jest.requireMock('fs').promises.rename = (): any => {
        throw new Error('error');
      };
      await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).rejects.toThrow();
    });

    it('should (on error) not unlink the temp file if it doesn\'t exist.', async(): Promise<void> => {
      jest.requireMock('fs').promises.lstat = (): any => ({
        isFile: (): boolean => false,
      });
      await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).rejects.toThrow();
    });
  });
});
