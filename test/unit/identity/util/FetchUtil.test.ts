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
      await expect(fetchDataset(url)).rejects.toThrow(`Cannot fetch ${url}`);
      expect(fetchMock).toHaveBeenCalledWith(url);
    });

    it('errors if there was an issue parsing the returned RDF.', async(): Promise<void> => {
      (datasetResponse.dataset as jest.Mock).mockRejectedValueOnce(new Error('Invalid RDF!'));
      await expect(fetchDataset(url)).rejects.toThrow(`Cannot fetch ${url}`);
    });

    it('returns the resulting Dataset.', async(): Promise<void> => {
      await expect(fetchDataset(url)).resolves.toBe(dataset);
    });
  });
});
