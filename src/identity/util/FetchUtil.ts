import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import type { Dataset } from 'rdf-js';
import { getLoggerFor } from '../../logging/LogUtil';

const logger = getLoggerFor('FetchUtil');

/**
 * Fetches an RDF dataset from the given URL.
 */
export async function fetchDataset(url: string): Promise<Dataset> {
  let rawResponse: DatasetResponse<Dataset>;
  try {
    rawResponse = (await fetch(url)) as DatasetResponse<Dataset>;
  } catch (err: unknown) {
    logger.error(err as string);
    throw new Error(`Cannot fetch ${url}`);
  }
  let dataset: Dataset;
  try {
    dataset = await rawResponse.dataset();
  } catch (err: unknown) {
    logger.error(err as string);
    throw new Error(`Could not parse RDF in ${url}`);
  }
  return dataset;
}
