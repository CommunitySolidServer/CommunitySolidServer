import streamifyArray from 'streamify-array';
import {
  decodeUriPathComponents,
  encodeUriPathComponents,
  ensureTrailingSlash,
  matchingMediaType,
  readableToString,
  toCanonicalUriPath,
} from '../../../src/util/Util';

describe('Util function', (): void => {
  describe('ensureTrailingSlash', (): void => {
    it('makes sure there is always exactly 1 slash.', async(): Promise<void> => {
      expect(ensureTrailingSlash('http://test.com')).toEqual('http://test.com/');
      expect(ensureTrailingSlash('http://test.com/')).toEqual('http://test.com/');
      expect(ensureTrailingSlash('http://test.com//')).toEqual('http://test.com/');
      expect(ensureTrailingSlash('http://test.com///')).toEqual('http://test.com/');
    });
  });

  describe('readableToString', (): void => {
    it('concatenates all elements of a Readable.', async(): Promise<void> => {
      const stream = streamifyArray([ 'a', 'b', 'c' ]);
      await expect(readableToString(stream)).resolves.toEqual('abc');
    });
  });

  describe('matchingMediaType', (): void => {
    it('matches all possible media types.', async(): Promise<void> => {
      expect(matchingMediaType('*/*', 'text/turtle')).toBeTruthy();
      expect(matchingMediaType('text/*', '*/*')).toBeTruthy();
      expect(matchingMediaType('text/*', 'text/turtle')).toBeTruthy();
      expect(matchingMediaType('text/plain', 'text/*')).toBeTruthy();
      expect(matchingMediaType('text/turtle', 'text/turtle')).toBeTruthy();

      expect(matchingMediaType('text/*', 'application/*')).toBeFalsy();
      expect(matchingMediaType('text/plain', 'application/*')).toBeFalsy();
      expect(matchingMediaType('text/plain', 'text/turtle')).toBeFalsy();
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
