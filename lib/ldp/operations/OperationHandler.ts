import { Operation } from './Operation';

/**
 * Handler for a specific operation type.
 */
export interface OperationHandler {
  /**
   * Checks if the handler supports the given operation.
   * @param operation - The input operation.
   *
   * @returns A promise resolving to a boolean indicating if this handler supports the operation.
   */
  canHandle: (operation: Operation) => Promise<boolean>;
  /**
   * Handles the given operation.
   * @param operation - The input operation.
   *
   * @returns A promise resolving when the operation is handled.
   */
  handle: (operation: Operation) => Promise<void>;
}
