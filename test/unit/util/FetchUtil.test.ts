import 'jest-rdf';
import { Readable } from 'node:stream';
import type { Quad } from '@rdfjs/types';
import type { Response } from 'cross-fetch';
import { DataFactory as DF } from 'n3';
import { rdfDereferencer } from 'rdf-dereference';
import { RdfToQuadConverter } from '../../../src/storage/conversion/RdfToQuadConverter';
import { fetchDataset, responseToDataset } from '../../../src/util/FetchUtil';
import { arrayifyStream } from '../../../src/util/StreamUtil';

jest.mock('rdf-dereference', (): any => ({
  rdfDereferencer: { dereference: jest.fn<string, any>() },
}));

describe('FetchUtil', (): void => {
  const url = 'http://test.com/foo';

  function mockResponse(body: string, contentType: string | null, status = 200): Response {
    return ({
      text: (): any => body,
      url,
      status,
      headers: { get: (): any => contentType },
    }) as any;
  }

  describe('#fetchDataset', (): void => {
    const rdfDereferenceMock: jest.Mocked<typeof rdfDereferencer> = rdfDereferencer as any;

    function mockDereference(quads?: Quad[]): any {
      rdfDereferenceMock.dereference.mockImplementation((uri: string): any => {
        if (!quads) {
          throw new Error('Throws error because url does not exist');
        }
        return {
          uri,
          data: Readable.from(quads),
        };
      });
    }

    it('errors if the URL does not exist.', async(): Promise<void> => {
      mockDereference();
      await expect(fetchDataset(url)).rejects.toThrow(`Could not parse resource at URL (${url})!`);
      expect(rdfDereferenceMock.dereference).toHaveBeenCalledWith(url);
    });

    it('returns a Representation with quads.', async(): Promise<void> => {
      const quads = [ DF.quad(DF.namedNode('http://test.com/s'), DF.namedNode('http://test.com/p'), DF.namedNode('http://test.com/o')) ];
      mockDereference(quads);
      const representation = await fetchDataset(url);
      await expect(arrayifyStream(representation.data)).resolves.toEqual([
        DF.quad(DF.namedNode('http://test.com/s'), DF.namedNode('http://test.com/p'), DF.namedNode('http://test.com/o')),
      ]);
    });
  });

  describe('#responseToDataset', (): void => {
    const converter = new RdfToQuadConverter();

    it('accepts Response objects as input.', async(): Promise<void> => {
      const response = mockResponse('<http://test.com/s> <http://test.com/p> <http://test.com/o>.', 'text/turtle');
      const body = await response.text();
      const representation = await responseToDataset(response, converter, body);
      await expect(arrayifyStream(representation.data)).resolves.toBeRdfIsomorphic([
        DF.quad(DF.namedNode('http://test.com/s'), DF.namedNode('http://test.com/p'), DF.namedNode('http://test.com/o')),
      ]);
    });

    it('errors if the status code is not 200.', async(): Promise<void> => {
      const response = mockResponse('Incorrect status!', null, 400);
      await expect(responseToDataset(response, converter)).rejects.toThrow(`Unable to access data at ${url}`);
    });

    it('errors if there is no content-type.', async(): Promise<void> => {
      const response = mockResponse('No content-type!', null);
      await expect(responseToDataset(response, converter)).rejects.toThrow(`Unable to access data at ${url}`);
    });
  });
});
