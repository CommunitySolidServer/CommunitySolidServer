import 'jest-rdf';
import type { Readable } from 'node:stream';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { AtomicFileDataAccessor } from '../../../../src/storage/accessors/AtomicFileDataAccessor';
import { ExtensionBasedMapper } from '../../../../src/storage/mapping/ExtensionBasedMapper';
import { APPLICATION_OCTET_STREAM } from '../../../../src/util/ContentTypes';
import type { Guarded } from '../../../../src/util/GuardedStream';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';
import { CONTENT_TYPE } from '../../../../src/util/Vocabularies';
import { mockFileSystem } from '../../../util/Util';

jest.mock('node:fs');
jest.mock('fs-extra');

describe('AtomicFileDataAccessor', (): void => {
  const rootFilePath = 'uploads';
  const base = 'http://test.com/';
  let accessor: AtomicFileDataAccessor;
  let cache: { data: any };
  let metadata: RepresentationMetadata;
  let data: Guarded<Readable>;

  beforeEach(async(): Promise<void> => {
    cache = mockFileSystem(rootFilePath, new Date());
    accessor = new AtomicFileDataAccessor(
      new ExtensionBasedMapper(base, rootFilePath),
      rootFilePath,
      './.internal/tempFiles/',
    );
    // The 'mkdirSync' in AtomicFileDataAccessor's constructor does not seem to create the folder in the
    // cache object used for mocking fs.
    // This line creates what represents a folder in the cache object
    cache.data['.internal'] = { tempFiles: {}};
    metadata = new RepresentationMetadata(APPLICATION_OCTET_STREAM);
    data = guardedStreamFrom([ 'data' ]);
  });

  describe('writing a document', (): void => {
    it('writes the data to the corresponding file.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      expect(cache.data.resource).toBe('data');
    });

    it('writes metadata to the corresponding metadata file.', async(): Promise<void> => {
      metadata = new RepresentationMetadata(
        { path: `${base}res.ttl` },
        { [CONTENT_TYPE]: 'text/turtle', likes: 'apples' },
      );
      await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).resolves.toBeUndefined();
      expect(cache.data['res.ttl']).toBe('data');
      expect(cache.data['res.ttl.meta']).toMatch(`<${base}res.ttl> <likes> "apples".`);
    });

    it('should delete temp file when done writing.', async(): Promise<void> => {
      await expect(accessor.writeDocument({ path: `${base}resource` }, data, metadata)).resolves.toBeUndefined();
      expect(Object.keys(cache.data['.internal'].tempFiles)).toHaveLength(0);
      expect(cache.data.resource).toBe('data');
    });

    it('should throw an error when writing the data goes wrong.', async(): Promise<void> => {
      jest.spyOn(data, 'read').mockImplementation((): any => {
        data.emit('error', new Error('error'));
        return null;
      });
      jest.spyOn(jest.requireMock('fs-extra'), 'stat').mockImplementation((): any => ({
        isFile: (): boolean => false,
      }));
      await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).rejects.toThrow('error');
    });

    it('should throw when renaming / moving the file goes wrong.', async(): Promise<void> => {
      jest.spyOn(jest.requireMock('fs-extra'), 'rename').mockImplementation((): any => {
        throw new Error('error');
      });
      jest.spyOn(jest.requireMock('fs-extra'), 'stat').mockImplementation((): any => ({
        isFile: (): boolean => true,
      }));
      await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).rejects.toThrow('error');
    });

    it('should (on error) not unlink the temp file if it does not exist.', async(): Promise<void> => {
      jest.spyOn(jest.requireMock('fs-extra'), 'rename').mockImplementation((): any => {
        throw new Error('error');
      });
      jest.spyOn(jest.requireMock('fs-extra'), 'stat').mockImplementation((): any => ({
        isFile: (): boolean => false,
      }));
      await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).rejects.toThrow('error');
    });

    it(
      'should throw when renaming / moving the file goes wrong and the temp file does not exist.',
      async(): Promise<void> => {
        jest.spyOn(jest.requireMock('fs-extra'), 'rename').mockImplementation((): any => {
          throw new Error('error');
        });
        jest.spyOn(jest.requireMock('fs-extra'), 'stat').mockImplementation();
        await expect(accessor.writeDocument({ path: `${base}res.ttl` }, data, metadata)).rejects.toThrow('error');
      },
    );
  });
});
