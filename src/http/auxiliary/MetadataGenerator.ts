import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { RepresentationMetadata } from '../representation/RepresentationMetadata';

/**
 * Generic interface for classes that add metadata to a RepresentationMetadata.
 */
export abstract class MetadataGenerator extends AsyncHandler<RepresentationMetadata> {}
