import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import type { Dataset } from 'rdf-js';
import { getLoggerFor } from '../../logging/LogUtil';
import { isNativeError } from '../../util/errors/ErrorUtil';

const logger = getLoggerFor('FetchUtil');

/**
 * Fetches an RDF dataset from the given URL.
 */
export async function fetchDataset(url: string): Promise<Dataset> {
  let rawResponse: DatasetResponse<Dataset>;
  try {
    rawResponse = (await fetch(url)) as DatasetResponse<Dataset>;
  } catch (err: unknown) {
    const errorMessage = `Cannot fetch ${url}: ${isNativeError(err) ? err.message : 'Unknown error'}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  let dataset: Dataset;
  try {
    dataset = await rawResponse.dataset();
  } catch (err: unknown) {
    const errorMessage = `Could not parse RDF in ${url}: ${isNativeError(err) ? err.message : 'Unknown error'}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  return dataset;
}
