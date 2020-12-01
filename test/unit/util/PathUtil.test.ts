import {
  decodeUriPathComponents,
  encodeUriPathComponents,
  ensureTrailingSlash,
  getParentContainer,
  toCanonicalUriPath,
} from '../../../src/util/PathUtil';

describe('PathUtil', (): void => {
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

  describe('#getParentContainer', (): void => {
    it('returns the parent URl for a single call.', async(): Promise<void> => {
      expect(getParentContainer({ path: 'http://test.com/foo/bar' })).toEqual({ path: 'http://test.com/foo/' });
      expect(getParentContainer({ path: 'http://test.com/foo/bar/' })).toEqual({ path: 'http://test.com/foo/' });
    });

    it('errors when the root of an URl is reached that does not match the input root.', async(): Promise<void> => {
      expect((): any => getParentContainer({ path: 'http://test.com/' }))
        .toThrow('Resource http://test.com/ does not have a parent container');
    });
  });
});
