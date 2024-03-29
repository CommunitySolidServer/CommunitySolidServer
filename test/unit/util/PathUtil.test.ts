import { promises as fsPromises } from 'node:fs';
import type { TargetExtractor } from '../../../src/http/input/identifier/TargetExtractor';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { extractErrorTerms } from '../../../src/util/errors/HttpErrorUtil';
import {
  absoluteFilePath,
  createSubdomainRegexp,
  decodeUriPathComponents,
  encodeUriPathComponents,
  ensureLeadingSlash,
  ensureTrailingSlash,
  extractScheme,
  getExtension,
  getModuleRoot,
  getRelativeUrl,
  isContainerIdentifier,
  isContainerPath,
  joinFilePath,
  joinUrl,
  modulePath,
  normalizeFilePath,
  resolveAssetPath,
  resolveModulePath,
  toCanonicalUriPath,
  trimTrailingSlashes,
} from '../../../src/util/PathUtil';

describe('PathUtil', (): void => {
  describe('#normalizeFilePath', (): void => {
    it('normalizes POSIX paths.', (): void => {
      expect(normalizeFilePath('/foo/bar/../baz')).toBe('/foo/baz');
    });

    it('normalizes Windows paths.', (): void => {
      expect(normalizeFilePath('c:\\foo\\bar\\..\\baz')).toBe('c:/foo/baz');
    });
  });

  describe('#joinFilePath', (): void => {
    it('joins POSIX paths.', (): void => {
      expect(joinFilePath('/foo/bar/', '..', '/baz')).toBe('/foo/baz');
    });

    it('joins Windows paths.', (): void => {
      expect(joinFilePath('c:\\foo\\bar\\', '..', '/baz')).toBe(`c:/foo/baz`);
    });
  });

  describe('#absoluteFilePath', (): void => {
    it('does not change absolute posix paths.', (): void => {
      expect(absoluteFilePath('/foo/bar/')).toBe('/foo/bar/');
    });

    it('converts absolute win32 paths to posix paths.', (): void => {
      expect(absoluteFilePath('C:\\foo\\bar')).toBe('C:/foo/bar');
    });

    it('makes relative paths absolute.', (): void => {
      expect(absoluteFilePath('foo/bar/')).toEqual(joinFilePath(process.cwd(), 'foo/bar/'));
    });
  });

  describe('#ensureTrailingSlash', (): void => {
    it('makes sure there is always exactly 1 slash.', (): void => {
      expect(ensureTrailingSlash('http://test.com')).toBe('http://test.com/');
      expect(ensureTrailingSlash('http://test.com/')).toBe('http://test.com/');
      expect(ensureTrailingSlash('http://test.com//')).toBe('http://test.com/');
      expect(ensureTrailingSlash('http://test.com///')).toBe('http://test.com/');
    });
  });

  describe('#trimTrailingSlashes', (): void => {
    it('removes all trailing slashes.', (): void => {
      expect(trimTrailingSlashes('http://test.com')).toBe('http://test.com');
      expect(trimTrailingSlashes('http://test.com/')).toBe('http://test.com');
      expect(trimTrailingSlashes('http://test.com//')).toBe('http://test.com');
      expect(trimTrailingSlashes('http://test.com///')).toBe('http://test.com');
    });
  });

  describe('#ensureLeadingSlash', (): void => {
    it('makes sure there is always exactly 1 slash.', (): void => {
      expect(ensureLeadingSlash('test')).toBe('/test');
      expect(ensureLeadingSlash('/test')).toBe('/test');
      expect(ensureLeadingSlash('//test')).toBe('/test');
      expect(ensureLeadingSlash('///test')).toBe('/test');
    });
  });

  describe('#getExtension', (): void => {
    it('returns the extension of a path.', (): void => {
      expect(getExtension('/a/b.txt')).toBe('txt');
      expect(getExtension('/a/btxt')).toBe('');
    });
  });

  describe('#toCanonicalUriPath', (): void => {
    it('encodes only the necessary parts.', (): void => {
      expect(toCanonicalUriPath('/a%20path&*/name')).toBe('/a%20path%26*/name');
    });

    it('leaves the query string untouched.', (): void => {
      expect(toCanonicalUriPath('/a%20path&/name?abc=def&xyz')).toBe('/a%20path%26/name?abc=def&xyz');
    });
  });

  describe('#decodeUriPathComponents', (): void => {
    it('decodes all parts of a path.', (): void => {
      expect(decodeUriPathComponents('/a%20path&/name')).toBe('/a path&/name');
    });

    it('leaves the query string untouched.', (): void => {
      expect(decodeUriPathComponents('/a%20path&/name?abc=def&xyz')).toBe('/a path&/name?abc=def&xyz');
    });

    it('ignores URL-encoded path separator characters.', (): void => {
      expect(decodeUriPathComponents('/a%20path&/c1/c2/t1%2F')).toBe('/a path&/c1/c2/t1%2F');
      expect(decodeUriPathComponents('/a%20path&/c1/c2/t1%5C')).toBe('/a path&/c1/c2/t1%5C');
      expect(decodeUriPathComponents('/a%20path&/c1/c2/t1%252F')).toBe('/a path&/c1/c2/t1%252F');
      expect(decodeUriPathComponents('/a%20path&/c1/c2/t1%255C')).toBe('/a path&/c1/c2/t1%255C');
      expect(decodeUriPathComponents('/a%20path&/c1/c2/t1%25%252F')).toBe('/a path&/c1/c2/t1%%252F');
      expect(decodeUriPathComponents('/a%20path&/c1/c2/t1%25%255C')).toBe('/a path&/c1/c2/t1%%255C');
    });

    it('normalizes to uppercase encoding.', (): void => {
      expect(decodeUriPathComponents('/a%20path&/c1/c2/t1%2f')).toBe('/a path&/c1/c2/t1%2F');
      expect(decodeUriPathComponents('/a%20path&/c1/c2/t1%5c')).toBe('/a path&/c1/c2/t1%5C');
    });

    it('accepts paths with mixed lowercase and uppercase encoding.', (): void => {
      expect(decodeUriPathComponents('/a%20path&/c1/c2/t1%2F%2f')).toBe('/a path&/c1/c2/t1%2F%2F');
      expect(decodeUriPathComponents('/a%20path&/c1/c2/t1%5C%5c')).toBe('/a path&/c1/c2/t1%5C%5C');
    });

    it('takes sequences of encoded percent signs into account.', (): void => {
      expect(decodeUriPathComponents('/a%2Fb')).toBe('/a%2Fb');
      expect(decodeUriPathComponents('/a%252Fb')).toBe('/a%252Fb');
      expect(decodeUriPathComponents('/a%25252Fb')).toBe('/a%25252Fb');
      expect(decodeUriPathComponents('/a%2525252Fb')).toBe('/a%2525252Fb');
    });

    it('ensures illegal path characters are encoded.', async(): Promise<void> => {
      expect(decodeUriPathComponents('/a<path%3F%3E/*:name?abc=def&xyz'))
        .toBe('/a%3Cpath%3F%3E/%2A%3Aname?abc=def&xyz');
    });
  });

  describe('#encodeUriPathComponents', (): void => {
    it('encodes all parts of a path.', (): void => {
      expect(encodeUriPathComponents('/a%20path&/name')).toBe('/a%2520path%26/name');
    });

    it('leaves the query string untouched.', (): void => {
      expect(encodeUriPathComponents('/a%20path&/name?abc=def&xyz')).toBe('/a%2520path%26/name?abc=def&xyz');
    });

    it('does not double-encode URL-encoded path separator characters.', (): void => {
      expect(encodeUriPathComponents('/a%20path&/c1/c2/t1%2F')).toBe('/a%2520path%26/c1/c2/t1%2F');
      expect(encodeUriPathComponents('/a%20path&/c1/c2/t1%5C')).toBe('/a%2520path%26/c1/c2/t1%5C');
      expect(encodeUriPathComponents('/a%20path&/c1/c2/t1%252F')).toBe('/a%2520path%26/c1/c2/t1%252F');
      expect(encodeUriPathComponents('/a%20path&/c1/c2/t1%255C')).toBe('/a%2520path%26/c1/c2/t1%255C');
      expect(encodeUriPathComponents('/a%20path&/c1/c2/t1%%252F')).toBe('/a%2520path%26/c1/c2/t1%25%252F');
      expect(encodeUriPathComponents('/a%20path&/c1/c2/t1%%255C')).toBe('/a%2520path%26/c1/c2/t1%25%255C');
    });

    it('normalizes to uppercase encoding.', (): void => {
      expect(encodeUriPathComponents('/a%20path&/c1/c2/t1%2f')).toBe('/a%2520path%26/c1/c2/t1%2F');
      expect(encodeUriPathComponents('/a%20path&/c1/c2/t1%5c')).toBe('/a%2520path%26/c1/c2/t1%5C');
    });

    it('accepts paths with mixed lowercase and uppercase encoding.', (): void => {
      expect(encodeUriPathComponents('/a%20path&/c1/c2/t1%2F%2f')).toBe('/a%2520path%26/c1/c2/t1%2F%2F');
      expect(encodeUriPathComponents('/a%20path&/c1/c2/t1%5C%5c')).toBe('/a%2520path%26/c1/c2/t1%5C%5C');
    });

    it('takes sequences of encoded percent signs into account.', (): void => {
      expect(encodeUriPathComponents('/a%2Fb')).toBe('/a%2Fb');
      expect(encodeUriPathComponents('/a%252Fb')).toBe('/a%252Fb');
      expect(encodeUriPathComponents('/a%25252Fb')).toBe('/a%25252Fb');
      expect(encodeUriPathComponents('/a%2525252Fb')).toBe('/a%2525252Fb');
    });
  });

  describe('#isContainerPath', (): void => {
    it('returns true if the path ends with a slash.', (): void => {
      expect(isContainerPath('/a/b')).toBe(false);
      expect(isContainerPath('/a/b/')).toBe(true);
    });
  });

  describe('#isContainerIdentifier', (): void => {
    it('works af isContainerPath but for identifiers.', (): void => {
      expect(isContainerIdentifier({ path: '/a/b' })).toBe(false);
      expect(isContainerIdentifier({ path: '/a/b/' })).toBe(true);
    });
  });

  describe('#extractScheme', (): void => {
    it('splits a URL.', (): void => {
      expect(extractScheme('http://test.com/foo')).toEqual({ scheme: 'http://', rest: 'test.com/foo' });
    });
  });

  describe('#getRelativeUrl', (): void => {
    const baseUrl = 'http://test.com/foo/';
    const request: HttpRequest = { url: '/resource' } as any;
    let targetExtractor: jest.Mocked<TargetExtractor>;

    beforeEach((): void => {
      targetExtractor = {
        handleSafe: jest.fn(({ request: req }): ResourceIdentifier => ({ path: joinUrl(baseUrl, req.url) })),
      } as any;
    });

    it('returns the relative path.', async(): Promise<void> => {
      await expect(getRelativeUrl(baseUrl, request, targetExtractor)).resolves.toBe('/resource');
    });

    it('errors if the target is outside of the server scope.', async(): Promise<void> => {
      targetExtractor.handleSafe.mockResolvedValueOnce({ path: 'http://somewhere.else/resource' });
      let error: unknown;
      try {
        await getRelativeUrl(baseUrl, request, targetExtractor);
      } catch (err: unknown) {
        error = err;
      }
      expect(error).toEqual(expect.objectContaining({ errorCode: 'E0001' }));
      expect(BadRequestHttpError.isInstance(error)).toBe(true);
      expect(extractErrorTerms((error as BadRequestHttpError).metadata)).toEqual({ path: 'http://somewhere.else/resource' });
    });
  });

  describe('#createSubdomainRegexp', (): void => {
    it('creates a regex to match the URL and extract a subdomain.', (): void => {
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
      await expect(fsPromises.access(packageJson)).resolves.toBeUndefined();
    });
  });

  describe('#modulePath', (): void => {
    it('transforms the empty input into "@css:".', (): void => {
      expect(modulePath()).toBe('@css:');
    });

    it('prefixes a path with "@css".', (): void => {
      expect(modulePath('foo/bar.json')).toBe('@css:foo/bar.json');
    });
  });

  describe('#resolveModulePath', (): void => {
    it('transforms the empty input into the module root path.', (): void => {
      expect(resolveModulePath()).toBe(getModuleRoot());
    });

    it('prefixes a path with the module root path.', (): void => {
      expect(resolveModulePath('foo/bar.json')).toBe(`${getModuleRoot()}foo/bar.json`);
    });
  });

  describe('#resolveAssetPath', (): void => {
    it('interprets paths relative to the module root when starting with "@css:".', (): void => {
      expect(resolveAssetPath('@css:foo/bar')).toBe(joinFilePath(getModuleRoot(), '/foo/bar'));
    });

    it('handles ../ paths with "@css":.', (): void => {
      expect(resolveAssetPath('@css:foo/bar/../baz')).toBe(joinFilePath(getModuleRoot(), '/foo/baz'));
    });

    it('leaves absolute paths as they are.', (): void => {
      expect(resolveAssetPath('/foo/bar/')).toBe('/foo/bar/');
    });

    it('handles other paths relative to the cwd.', (): void => {
      expect(resolveAssetPath('foo/bar/')).toBe(joinFilePath(process.cwd(), 'foo/bar/'));
    });

    it('handles other paths with ../.', (): void => {
      expect(resolveAssetPath('foo/bar/../baz')).toBe(joinFilePath(process.cwd(), 'foo/baz'));
    });
  });
});
