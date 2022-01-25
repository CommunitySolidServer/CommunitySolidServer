import { existsSync } from 'fs';
import type { TargetExtractor } from '../../../src/http/input/identifier/TargetExtractor';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import {
  absoluteFilePath,
  createSubdomainRegexp,
  decodeUriPathComponents,
  encodeUriPathComponents,
  ensureTrailingSlash,
  extractScheme,
  getExtension,
  getModuleRoot,
  getRelativeUrl,
  isContainerIdentifier,
  isContainerPath,
  joinFilePath,
  joinUrl,
  normalizeFilePath,
  resolveAssetPath,
  toCanonicalUriPath,
  trimTrailingSlashes,
} from '../../../src/util/PathUtil';

describe('PathUtil', (): void => {
  describe('#normalizeFilePath', (): void => {
    it('normalizes POSIX paths.', async(): Promise<void> => {
      expect(normalizeFilePath('/foo/bar/../baz')).toBe('/foo/baz');
    });

    it('normalizes Windows paths.', async(): Promise<void> => {
      expect(normalizeFilePath('c:\\foo\\bar\\..\\baz')).toBe('c:/foo/baz');
    });
  });

  describe('#joinFilePath', (): void => {
    it('joins POSIX paths.', async(): Promise<void> => {
      expect(joinFilePath('/foo/bar/', '..', '/baz')).toBe('/foo/baz');
    });

    it('joins Windows paths.', async(): Promise<void> => {
      expect(joinFilePath('c:\\foo\\bar\\', '..', '/baz')).toEqual(`c:/foo/baz`);
    });
  });

  describe('#absoluteFilePath', (): void => {
    it('does not change absolute posix paths.', async(): Promise<void> => {
      expect(absoluteFilePath('/foo/bar/')).toBe('/foo/bar/');
    });

    it('converts absolute win32 paths to posix paths.', async(): Promise<void> => {
      expect(absoluteFilePath('C:\\foo\\bar')).toBe('C:/foo/bar');
    });

    it('makes relative paths absolute.', async(): Promise<void> => {
      expect(absoluteFilePath('foo/bar/')).toEqual(joinFilePath(process.cwd(), 'foo/bar/'));
    });
  });

  describe('#ensureTrailingSlash', (): void => {
    it('makes sure there is always exactly 1 slash.', async(): Promise<void> => {
      expect(ensureTrailingSlash('http://test.com')).toBe('http://test.com/');
      expect(ensureTrailingSlash('http://test.com/')).toBe('http://test.com/');
      expect(ensureTrailingSlash('http://test.com//')).toBe('http://test.com/');
      expect(ensureTrailingSlash('http://test.com///')).toBe('http://test.com/');
    });
  });

  describe('#trimTrailingSlashes', (): void => {
    it('removes all trailing slashes.', async(): Promise<void> => {
      expect(trimTrailingSlashes('http://test.com')).toBe('http://test.com');
      expect(trimTrailingSlashes('http://test.com/')).toBe('http://test.com');
      expect(trimTrailingSlashes('http://test.com//')).toBe('http://test.com');
      expect(trimTrailingSlashes('http://test.com///')).toBe('http://test.com');
    });
  });

  describe('#getExtension', (): void => {
    it('returns the extension of a path.', async(): Promise<void> => {
      expect(getExtension('/a/b.txt')).toBe('txt');
      expect(getExtension('/a/btxt')).toBe('');
    });
  });

  describe('#toCanonicalUriPath', (): void => {
    it('encodes only the necessary parts.', async(): Promise<void> => {
      expect(toCanonicalUriPath('/a%20path&/name')).toBe('/a%20path%26/name');
    });

    it('leaves the query string untouched.', async(): Promise<void> => {
      expect(toCanonicalUriPath('/a%20path&/name?abc=def&xyz')).toBe('/a%20path%26/name?abc=def&xyz');
    });
  });

  describe('#decodeUriPathComponents', (): void => {
    it('decodes all parts of a path.', async(): Promise<void> => {
      expect(decodeUriPathComponents('/a%20path&/name')).toBe('/a path&/name');
    });

    it('leaves the query string untouched.', async(): Promise<void> => {
      expect(decodeUriPathComponents('/a%20path&/name?abc=def&xyz')).toBe('/a path&/name?abc=def&xyz');
    });
  });

  describe('#encodeUriPathComponents', (): void => {
    it('encodes all parts of a path.', async(): Promise<void> => {
      expect(encodeUriPathComponents('/a%20path&/name')).toBe('/a%2520path%26/name');
    });

    it('leaves the query string untouched.', async(): Promise<void> => {
      expect(encodeUriPathComponents('/a%20path&/name?abc=def&xyz')).toBe('/a%2520path%26/name?abc=def&xyz');
    });
  });

  describe('#isContainerPath', (): void => {
    it('returns true if the path ends with a slash.', async(): Promise<void> => {
      expect(isContainerPath('/a/b')).toBe(false);
      expect(isContainerPath('/a/b/')).toBe(true);
    });
  });

  describe('#isContainerIdentifier', (): void => {
    it('works af isContainerPath but for identifiers.', async(): Promise<void> => {
      expect(isContainerIdentifier({ path: '/a/b' })).toBe(false);
      expect(isContainerIdentifier({ path: '/a/b/' })).toBe(true);
    });
  });

  describe('#extractScheme', (): void => {
    it('splits a URL.', async(): Promise<void> => {
      expect(extractScheme('http://test.com/foo')).toEqual({ scheme: 'http://', rest: 'test.com/foo' });
    });
  });

  describe('#getRelativeUrl', (): void => {
    const baseUrl = 'http://test.com/foo/';
    const request: HttpRequest = { url: '/resource' } as any;
    let targetExtractor: jest.Mocked<TargetExtractor>;

    beforeEach((): void => {
      targetExtractor = {
        handleSafe: jest.fn(({ request: req }): ResourceIdentifier => ({ path: joinUrl(baseUrl, req.url!) })),
      } as any;
    });

    it('returns the relative path.', async(): Promise<void> => {
      await expect(getRelativeUrl(baseUrl, request, targetExtractor)).resolves.toBe('/resource');
    });

    it('errors if the target is outside of the server scope.', async(): Promise<void> => {
      targetExtractor.handleSafe.mockResolvedValueOnce({ path: 'http://somewhere.else/resource' });
      await expect(getRelativeUrl(baseUrl, request, targetExtractor)).rejects
        .toThrow(expect.objectContaining({ errorCode: 'E0001', details: { path: 'http://somewhere.else/resource' }}));
    });
  });

  describe('#createSubdomainRegexp', (): void => {
    it('creates a regex to match the URL and extract a subdomain.', async(): Promise<void> => {
      const regex = createSubdomainRegexp('http://test.com/foo/');
      expect(regex.exec('http://test.com/foo/')![1]).toBeUndefined();
      expect(regex.exec('http://test.com/foo/bar')![1]).toBeUndefined();
      expect(regex.exec('http://alice.test.com/foo/')![1]).toBe('alice');
      expect(regex.exec('http://alice.bob.test.com/foo/')![1]).toBe('alice.bob');
      expect(regex.exec('http://test.com/')).toBeNull();
      expect(regex.exec('http://alicetest.com/foo/')).toBeNull();
    });
  });

  describe('#getModuleRoot', (): void => {
    it('returns the root folder of the module.', async(): Promise<void> => {
      // Note that this test only makes sense as long as the dist folder is on the same level as the src folder
      const root = getModuleRoot();
      const packageJson = joinFilePath(root, 'package.json');
      expect(existsSync(packageJson)).toBe(true);
    });
  });

  describe('#resolvePathInput', (): void => {
    it('interprets paths relative to the module root when starting with @css:.', async(): Promise<void> => {
      expect(resolveAssetPath('@css:foo/bar')).toBe(joinFilePath(getModuleRoot(), '/foo/bar'));
    });

    it('handles ../ paths with @css:.', async(): Promise<void> => {
      expect(resolveAssetPath('@css:foo/bar/../baz')).toBe(joinFilePath(getModuleRoot(), '/foo/baz'));
    });

    it('leaves absolute paths as they are.', async(): Promise<void> => {
      expect(resolveAssetPath('/foo/bar/')).toBe('/foo/bar/');
    });

    it('handles other paths relative to the cwd.', async(): Promise<void> => {
      expect(resolveAssetPath('foo/bar/')).toBe(joinFilePath(process.cwd(), 'foo/bar/'));
    });

    it('handles other paths with ../.', async(): Promise<void> => {
      expect(resolveAssetPath('foo/bar/../baz')).toBe(joinFilePath(process.cwd(), 'foo/baz'));
    });
  });
});
