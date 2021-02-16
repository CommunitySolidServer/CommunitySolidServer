import type { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';

/**
 * The output of an Authorizer
 */
export interface Authorization {
  /**
   * Add metadata relevant for this Authorization.
   * @param metadata - Metadata to update.
   */
  addMetadata: (metadata: RepresentationMetadata) => void;
}
