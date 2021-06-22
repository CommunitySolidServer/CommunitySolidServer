import type { RepresentationMetadata } from '../representation/RepresentationMetadata';

/**
 * Generic interface for classes that add metadata to a RepresentationMetadata.
 */
export interface MetadataGenerator {
  add: (metadata: RepresentationMetadata) => Promise<void>;
  remove: (metadata: RepresentationMetadata) => Promise<void>;
}
