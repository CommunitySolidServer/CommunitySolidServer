import {
  absoluteFilePath,
  decodeUriPathComponents,
  encodeUriPathComponents,
  ensureTrailingSlash,
  joinFilePath,
  normalizeFilePath,
  toCanonicalUriPath,
} from '../../../src/util/PathUtil';

describe('PathUtil', (): void => {
  describe('#normalizeFilePath', (): void => {
    it('normalizes POSIX paths.', async(): Promise<void> => {
      expect(normalizeFilePath('/foo/bar/../baz')).toEqual('/foo/baz');
    });

    it('normalizes Windows paths.', async(): Promise<void> => {
      expect(normalizeFilePath('c:\\foo\\bar\\..\\baz')).toEqual('c:/foo/baz');
    });
  });

  describe('#joinFilePath', (): void => {
    it('joins POSIX paths.', async(): Promise<void> => {
      expect(joinFilePath('/foo/bar/', '..', '/baz')).toEqual('/foo/baz');
    });

    it('joins Windows paths.', async(): Promise<void> => {
      expect(joinFilePath('c:\\foo\\bar\\', '..', '/baz')).toEqual(`c:/foo/baz`);
    });
  });

  describe('#absoluteFilePath', (): void => {
    it('does not change absolute posix paths.', async(): Promise<void> => {
      expect(absoluteFilePath('/foo/bar/')).toEqual('/foo/bar/');
    });

    it('converts absolute win32 paths to posix paths.', async(): Promise<void> => {
      expect(absoluteFilePath('C:\\foo\\bar')).toEqual('C:/foo/bar');
    });

    it('makes relative paths absolute.', async(): Promise<void> => {
      expect(absoluteFilePath('foo/bar/')).toEqual(joinFilePath(process.cwd(), 'foo/bar/'));
    });
  });

  describe('#ensureTrailingSlash', (): void => {
    it('makes sure there is always exactly 1 slash.', async(): Promise<void> => {
      expect(ensureTrailingSlash('http://test.com')).toEqual('http://test.com/');
      expect(ensureTrailingSlash('http://test.com/')).toEqual('http://test.com/');
      expect(ensureTrailingSlash('http://test.com//')).toEqual('http://test.com/');
      expect(ensureTrailingSlash('http://test.com///')).toEqual('http://test.com/');
    });
  });

  describe('UriPath functions', (): void => {
    it('makes sure only the necessary parts are encoded with toCanonicalUriPath.', async(): Promise<void> => {
      expect(toCanonicalUriPath('/a%20path&/name')).toEqual('/a%20path%26/name');
    });

    it('decodes all parts of a path with decodeUriPathComponents.', async(): Promise<void> => {
      expect(decodeUriPathComponents('/a%20path&/name')).toEqual('/a path&/name');
    });

    it('encodes all parts of a path with encodeUriPathComponents.', async(): Promise<void> => {
      expect(encodeUriPathComponents('/a%20path&/name')).toEqual('/a%2520path%26/name');
    });
  });
});
