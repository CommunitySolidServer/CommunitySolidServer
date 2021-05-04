import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import type { Dataset } from 'rdf-js';
import { fetchDataset } from '../../../../src/identity/util/FetchUtil';

jest.mock('@rdfjs/fetch');

describe('FetchUtil', (): void => {
  describe('#fetchDataset', (): void => {
    const fetchMock: jest.Mock = fetch as any;
    const url = 'http://test.com/foo';
    let datasetResponse: DatasetResponse<Dataset>;
    const dataset: Dataset = {} as any;

    beforeEach(async(): Promise<void> => {
      datasetResponse = {
        dataset: jest.fn().mockReturnValue(dataset),
      } as any;

      fetchMock.mockResolvedValue(datasetResponse);
    });

    it('errors if there was an issue fetching.', async(): Promise<void> => {
      fetchMock.mockRejectedValueOnce(new Error('Invalid webId!'));
      await expect(fetchDataset(url)).rejects.toThrow(`Cannot fetch ${url}: Invalid webId!`);
      expect(fetchMock).toHaveBeenCalledWith(url);

      fetchMock.mockRejectedValueOnce('apple');
      await expect(fetchDataset(url)).rejects.toThrow(`Cannot fetch ${url}: Unknown error`);
    });

    it('errors if there was an issue parsing the returned RDF.', async(): Promise<void> => {
      (datasetResponse.dataset as jest.Mock).mockRejectedValueOnce(new Error('Invalid RDF!'));
      await expect(fetchDataset(url)).rejects.toThrow(`Could not parse RDF in ${url}: Invalid RDF!`);

      (datasetResponse.dataset as jest.Mock).mockRejectedValueOnce('apple');
      await expect(fetchDataset(url)).rejects.toThrow(`Could not parse RDF in ${url}: Unknown error`);
    });

    it('returns the resulting Dataset.', async(): Promise<void> => {
      await expect(fetchDataset(url)).resolves.toBe(dataset);
    });
  });
});
