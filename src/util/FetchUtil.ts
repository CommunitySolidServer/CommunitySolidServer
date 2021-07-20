import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import type { Dataset } from 'rdf-js';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage } from './errors/ErrorUtil';

const logger = getLoggerFor('FetchUtil');

/**
 * Fetches an RDF dataset from the given URL.
 */
export async function fetchDataset(url: string): Promise<Dataset> {
  let rawResponse: DatasetResponse<Dataset>;
  try {
    rawResponse = (await fetch(url)) as DatasetResponse<Dataset>;
  } catch (err: unknown) {
    logger.error(`Cannot fetch ${url}: ${createErrorMessage(err)}`);
    throw new Error(`Cannot fetch ${url}`);
  }
  let dataset: Dataset;
  try {
    dataset = await rawResponse.dataset();
  } catch (err: unknown) {
    logger.error(`Could not parse RDF in ${url}: ${createErrorMessage(err)}`);
    // Keeping the error message the same to prevent leaking possible information about intranet
    throw new Error(`Cannot fetch ${url}`);
  }
  return dataset;
}
