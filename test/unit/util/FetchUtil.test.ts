import { Readable } from 'stream';
import type { Quad } from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { fetch } from 'cross-fetch';
import { DataFactory } from 'n3';
import rdfDereferencer from 'rdf-dereference';
import { RdfToQuadConverter } from '../../../src/storage/conversion/RdfToQuadConverter';
import { fetchDataset, responseToDataset } from '../../../src/util/FetchUtil';
const { namedNode, quad } = DataFactory;

jest.mock('cross-fetch');
jest.mock('rdf-dereference', (): any => ({
  dereference: jest.fn<string, any>(),
}));

describe('FetchUtil', (): void => {
  const url = 'http://test.com/foo';

  describe('#fetchDataset', (): void => {
    const rdfDereferenceMock: jest.Mocked<typeof rdfDereferencer> = rdfDereferencer as any;

    function mockDereference(quads?: Quad[]): any {
      rdfDereferenceMock.dereference.mockImplementation((uri: string): any => {
        if (!quads) {
          throw new Error('Throws error because url does not exist');
        }
        return {
          uri,
          quads: Readable.from(quads),
          exists: true,
        };
      });
    }

    it('errors if the URL does not exist.', async(): Promise<void> => {
      mockDereference();
      await expect(fetchDataset(url)).rejects.toThrow(`Could not parse resource at URL (${url})!`);
      expect(rdfDereferenceMock.dereference).toHaveBeenCalledWith(url);
    });

    it('returns a Representation with quads.', async(): Promise<void> => {
      const quads = [ quad(namedNode('http://test.com/s'), namedNode('http://test.com/p'), namedNode('http://test.com/o')) ];
      mockDereference(quads);
      const representation = await fetchDataset(url);
      await expect(arrayifyStream(representation.data)).resolves.toEqual([
        quad(namedNode('http://test.com/s'), namedNode('http://test.com/p'), namedNode('http://test.com/o')),
      ]);
    });
  });

  describe('#responseToDataset', (): void => {
    const fetchMock: jest.Mock = fetch as any;
    const converter = new RdfToQuadConverter();

    function mockFetch(body: string, status = 200): void {
      fetchMock.mockImplementation((input: string): any => ({
        text: (): any => body,
        url: input,
        status,
        headers: { get: (): any => 'text/turtle' },
      }));
    }

    it('accepts Response objects as input.', async(): Promise<void> => {
      mockFetch('<http://test.com/s> <http://test.com/p> <http://test.com/o>.');
      const response = await fetch(url);
      const body = await response.text();
      const representation = await responseToDataset(response, converter, body);
      await expect(arrayifyStream(representation.data)).resolves.toEqual([
        quad(namedNode('http://test.com/s'), namedNode('http://test.com/p'), namedNode('http://test.com/o')),
      ]);
    });

    it('errors if the status code is not 200.', async(): Promise<void> => {
      mockFetch('Incorrect status!', 400);
      await expect(responseToDataset(await fetch(url), converter)).rejects.toThrow(`Unable to access data at ${url}`);
      expect(fetchMock).toHaveBeenCalledWith(url);
    });

    it('errors if there is no content-type.', async(): Promise<void> => {
      fetchMock.mockResolvedValueOnce({ url, text: (): any => '', status: 200, headers: { get: jest.fn() }});
      await expect(responseToDataset(await fetch(url), converter)).rejects.toThrow(`Unable to access data at ${url}`);
      expect(fetchMock).toHaveBeenCalledWith(url);
    });
  });
});
