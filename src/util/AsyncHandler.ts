/**
 * Simple interface for classes that can potentially handle a specific kind of data asynchronously.
 */
export interface AsyncHandler<TInput, TOutput = void> {
  /**
   * Checks if the input data can be handled by this class.
   * @param input - Input data that would be handled potentially.
   * @returns A promise resolving to if this input can be handled.
   */
  canHandle: (input: TInput) => Promise<boolean>;
  /**
   * Handles the given input. This should only be done if the {@link canHandle} function returned `true`.
   * @param input - Input data that needs to be handled.
   * @returns A promise resolving when the handling is finished. Return value depends on the given type.
   */
  handle: (input: TInput) => Promise<TOutput>;
}
