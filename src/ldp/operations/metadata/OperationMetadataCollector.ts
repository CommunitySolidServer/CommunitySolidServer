import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import type { Operation } from '../Operation';

export interface OperationMetadataCollectorInput {
  /**
   * Metadata to update with permission knowledge.
   */
  metadata: RepresentationMetadata;
  /**
   * Operation corresponding to the request.
   */
  operation: Operation;
}

/**
 * Adds metadata about the operation to the provided metadata object.
 */
export abstract class OperationMetadataCollector extends AsyncHandler<OperationMetadataCollectorInput> {}
