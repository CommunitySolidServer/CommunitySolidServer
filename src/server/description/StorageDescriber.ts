import type { Quad } from '@rdfjs/types';
import { AsyncHandler } from 'asynchronous-handlers';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';

/**
 * Generates Quads that need to be added to the given storage description resource.
 */
export abstract class StorageDescriber extends AsyncHandler<ResourceIdentifier, Quad[]> {}
