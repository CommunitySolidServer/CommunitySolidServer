import type { Quad } from '@rdfjs/types';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 * Generates Quads that need to be added to the given storage description resource.
 */
export abstract class StorageDescriber extends AsyncHandler<ResourceIdentifier, Quad[]> {}
