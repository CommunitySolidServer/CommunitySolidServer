import { PassThrough } from 'stream';
import { DataFactory } from 'n3';
import type { Quad } from 'rdf-js';
import streamifyArray from 'streamify-array';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import {
  addHeader,
  decodeUriPathComponents,
  encodeUriPathComponents,
  ensureTrailingSlash,
  matchingMediaType, pipeSafe, pushQuad,
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

  describe('pipeStreamsAndErrors', (): void => {
    it('pipes data from one stream to the other.', async(): Promise<void> => {
      const input = streamifyArray([ 'data' ]);
      const output = new PassThrough();
      const piped = pipeSafe(input, output);
      await expect(readableToString(piped)).resolves.toEqual('data');
    });

    it('pipes errors from one stream to the other.', async(): Promise<void> => {
      const input = new PassThrough();
      input.read = (): any => {
        input.emit('error', new Error('error'));
        return null;
      };
      const output = new PassThrough();
      const piped = pipeSafe(input, output);
      await expect(readableToString(piped)).rejects.toThrow(new Error('error'));
    });

    it('supports mapping errors to something else.', async(): Promise<void> => {
      const input = streamifyArray([ 'data' ]);
      input.read = (): any => {
        input.emit('error', new Error('error'));
        return null;
      };
      const output = new PassThrough();
      const piped = pipeSafe(input, output, (): any => new Error('other error'));
      await expect(readableToString(piped)).rejects.toThrow(new Error('other error'));
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

  describe('pushQuad', (): void => {
    it('creates a quad and adds it to the given array.', async(): Promise<void> => {
      const quads: Quad[] = [];
      pushQuad(quads, DataFactory.namedNode('sub'), DataFactory.namedNode('pred'), DataFactory.literal('obj'));
      expect(quads).toEqualRdfQuadArray([
        DataFactory.quad(DataFactory.namedNode('sub'), DataFactory.namedNode('pred'), DataFactory.literal('obj')),
      ]);
    });
  });

  describe('addHeader', (): void => {
    let response: HttpResponse;

    beforeEach(async(): Promise<void> => {
      const headers: Record<string, string | number | string[]> = {};
      response = {
        hasHeader: (name: string): boolean => Boolean(headers[name]),
        getHeader: (name: string): number | string | string[] | undefined => headers[name],
        setHeader(name: string, value: number | string | string[]): void {
          headers[name] = value;
        },
      } as any;
    });

    it('adds values if there are none already.', async(): Promise<void> => {
      expect(addHeader(response, 'name', 'value')).toBeUndefined();
      expect(response.getHeader('name')).toBe('value');

      expect(addHeader(response, 'names', [ 'value1', 'values2' ])).toBeUndefined();
      expect(response.getHeader('names')).toEqual([ 'value1', 'values2' ]);
    });

    it('appends values to already existing values.', async(): Promise<void> => {
      response.setHeader('name', 'oldValue');
      expect(addHeader(response, 'name', 'value')).toBeUndefined();
      expect(response.getHeader('name')).toEqual([ 'oldValue', 'value' ]);

      response.setHeader('number', 5);
      expect(addHeader(response, 'number', 'value')).toBeUndefined();
      expect(response.getHeader('number')).toEqual([ '5', 'value' ]);

      response.setHeader('names', [ 'oldValue1', 'oldValue2' ]);
      expect(addHeader(response, 'names', [ 'value1', 'values2' ])).toBeUndefined();
      expect(response.getHeader('names')).toEqual([ 'oldValue1', 'oldValue2', 'value1', 'values2' ]);
    });
  });
});
