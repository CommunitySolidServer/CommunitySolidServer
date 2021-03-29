import fetch from '@rdfjs/fetch';
import { fetchDataset } from '../../../../src/identity/util/FetchUtil';

jest.mock('@rdfjs/fetch');

describe('FetchUtil', (): void => {
  describe('#fetchDataset', (): void => {
    const fetchMock: jest.Mock = fetch as any;
    const url = 'http://test.com/foo';

    it('errors if there was an issue fetching.', async(): Promise<void> => {
      fetchMock.mockRejectedValueOnce('Invalid webId!');
      await expect(fetchDataset(url)).rejects.toThrow(`Cannot fetch ${url}`);
      expect(fetchMock).toHaveBeenCalledWith(url);
    });

    it('errors if there was an issue parsing the returned RDF.', async(): Promise<void> => {
      fetchMock.mockResolvedValueOnce('Invalid RDF!');
      await expect(fetchDataset(url)).rejects.toThrow(`Could not parse RDF in ${url}`);
    });

    it('returns the resulting Dataset.', async(): Promise<void> => {
      const datasetResponse = {
        dataset: jest.fn().mockReturnValueOnce('dataset!'),
      };
      fetchMock.mockResolvedValueOnce(datasetResponse);
      await expect(fetchDataset(url)).resolves.toBe('dataset!');
    });
  });
});
