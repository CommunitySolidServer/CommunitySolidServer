import arrayifyStream from 'arrayify-stream';
import { fetch } from 'cross-fetch';
import { DataFactory } from 'n3';
import { RdfToQuadConverter } from '../../../src/storage/conversion/RdfToQuadConverter';
import { fetchDataset } from '../../../src/util/FetchUtil';
const { namedNode, quad } = DataFactory;

jest.mock('cross-fetch');

describe('FetchUtil', (): void => {
  describe('#fetchDataset', (): void => {
    const fetchMock: jest.Mock = fetch as any;
    const url = 'http://test.com/foo';
    const converter = new RdfToQuadConverter();

    function mockFetch(body: string, status = 200): void {
      fetchMock.mockImplementation((input: string): any => ({
        text: (): any => body,
        url: input,
        status,
        headers: { get: (): any => 'text/turtle' },
      }));
    }

    it('errors if the status code is not 200.', async(): Promise<void> => {
      mockFetch('Invalid URL!', 404);
      await expect(fetchDataset(url, converter)).rejects.toThrow(`Unable to access data at ${url}`);
      expect(fetchMock).toHaveBeenCalledWith(url);
    });

    it('errors if there is no content-type.', async(): Promise<void> => {
      fetchMock.mockResolvedValueOnce({ url, text: (): any => '', status: 200, headers: { get: jest.fn() }});
      await expect(fetchDataset(url, converter)).rejects.toThrow(`Unable to access data at ${url}`);
      expect(fetchMock).toHaveBeenCalledWith(url);
    });

    it('returns a Representation with quads.', async(): Promise<void> => {
      mockFetch('<http://test.com/s> <http://test.com/p> <http://test.com/o>.');
      const representation = await fetchDataset(url, converter);
      await expect(arrayifyStream(representation.data)).resolves.toEqual([
        quad(namedNode('http://test.com/s'), namedNode('http://test.com/p'), namedNode('http://test.com/o')),
      ]);
    });

    it('accepts Response objects as input.', async(): Promise<void> => {
      mockFetch('<http://test.com/s> <http://test.com/p> <http://test.com/o>.');
      const response = await fetch(url);
      const body = await response.text();
      const representation = await fetchDataset(response, converter, body);
      await expect(arrayifyStream(representation.data)).resolves.toEqual([
        quad(namedNode('http://test.com/s'), namedNode('http://test.com/p'), namedNode('http://test.com/o')),
      ]);
    });
  });
});
