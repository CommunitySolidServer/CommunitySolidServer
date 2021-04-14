import {
  absoluteFilePath, createSubdomainRegexp,
  decodeUriPathComponents,
  encodeUriPathComponents,
  ensureTrailingSlash, extractScheme, getExtension, isContainerIdentifier, isContainerPath,
  joinFilePath,
  normalizeFilePath,
  toCanonicalUriPath, trimTrailingSlashes,
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

  describe('#trimTrailingSlashes', (): void => {
    it('removes all trailing slashes.', async(): Promise<void> => {
      expect(trimTrailingSlashes('http://test.com')).toEqual('http://test.com');
      expect(trimTrailingSlashes('http://test.com/')).toEqual('http://test.com');
      expect(trimTrailingSlashes('http://test.com//')).toEqual('http://test.com');
      expect(trimTrailingSlashes('http://test.com///')).toEqual('http://test.com');
    });
  });

  describe('#getExtension', (): void => {
    it('returns the extension of a path.', async(): Promise<void> => {
      expect(getExtension('/a/b.txt')).toEqual('txt');
      expect(getExtension('/a/btxt')).toEqual('');
    });
  });

  describe('#toCanonicalUriPath', (): void => {
    it('encodes only the necessary parts.', async(): Promise<void> => {
      expect(toCanonicalUriPath('/a%20path&/name')).toEqual('/a%20path%26/name');
    });

    it('leaves the query string untouched.', async(): Promise<void> => {
      expect(toCanonicalUriPath('/a%20path&/name?abc=def&xyz')).toEqual('/a%20path%26/name?abc=def&xyz');
    });
  });

  describe('#decodeUriPathComponents', (): void => {
    it('decodes all parts of a path.', async(): Promise<void> => {
      expect(decodeUriPathComponents('/a%20path&/name')).toEqual('/a path&/name');
    });

    it('leaves the query string untouched.', async(): Promise<void> => {
      expect(decodeUriPathComponents('/a%20path&/name?abc=def&xyz')).toEqual('/a path&/name?abc=def&xyz');
    });
  });

  describe('#encodeUriPathComponents', (): void => {
    it('encodes all parts of a path.', async(): Promise<void> => {
      expect(encodeUriPathComponents('/a%20path&/name')).toEqual('/a%2520path%26/name');
    });

    it('leaves the query string untouched.', async(): Promise<void> => {
      expect(encodeUriPathComponents('/a%20path&/name?abc=def&xyz')).toEqual('/a%2520path%26/name?abc=def&xyz');
    });
  });

  describe('#isContainerPath', (): void => {
    it('returns true if the path ends with a slash.', async(): Promise<void> => {
      expect(isContainerPath('/a/b')).toEqual(false);
      expect(isContainerPath('/a/b/')).toEqual(true);
    });
  });

  describe('#isContainerIdentifier', (): void => {
    it('works af isContainerPath but for identifiers.', async(): Promise<void> => {
      expect(isContainerIdentifier({ path: '/a/b' })).toEqual(false);
      expect(isContainerIdentifier({ path: '/a/b/' })).toEqual(true);
    });
  });

  describe('#extractScheme', (): void => {
    it('splits a URL.', async(): Promise<void> => {
      expect(extractScheme('http://test.com/foo')).toEqual({ scheme: 'http://', rest: 'test.com/foo' });
    });
  });

  describe('#createSubdomainRegexp', (): void => {
    it('creates a regex to match the URL and extract a subdomain.', async(): Promise<void> => {
      const regex = createSubdomainRegexp('http://test.com/foo/');
      expect(regex.exec('http://test.com/foo/')![1]).toBeUndefined();
      expect(regex.exec('http://test.com/foo/bar')![1]).toBeUndefined();
      expect(regex.exec('http://alice.test.com/foo/')![1]).toEqual('alice');
      expect(regex.exec('http://alice.bob.test.com/foo/')![1]).toEqual('alice.bob');
      expect(regex.exec('http://test.com/')).toBeNull();
      expect(regex.exec('http://alicetest.com/foo/')).toBeNull();
    });
  });
});
