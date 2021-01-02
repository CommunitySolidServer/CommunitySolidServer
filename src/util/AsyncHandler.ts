/**
 * Simple interface for classes that can potentially handle a specific kind of data asynchronously.
 */
export abstract class AsyncHandler<TIn = void, TOut = void> {
  /**
   * Checks if the input data can be handled by this class.
   * Throws an error if it can't handle the data.
   * @param input - Input data that would be handled potentially.
   *
   * @returns A promise resolving if this input can be handled, rejecting with an Error if not.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async canHandle(input: TIn): Promise<void | AsyncHandler<TIn, TOut>> {
    // Support any input by default
  }

  /**
   * Handles the given input. This should only be done if the {@link canHandle} function returned `true`.
   * @param input - Input data that needs to be handled.
   *
   * @returns A promise resolving when the handling is finished. Return value depends on the given type.
   */
  public abstract handle(input: TIn, handler?: AsyncHandler<TIn, TOut>): Promise<TOut>;

  /**
   * Helper function that first runs the canHandle function followed by the handle function.
   * Throws the error of the {@link canHandle} function if the data can't be handled,
   * or returns the result of the {@link handle} function otherwise.
   * @param data - The data to handle.
   *
   * @returns The result of the handle function of the handler.
   */
  public async handleSafe(data: TIn): Promise<TOut> {
    await this.canHandle(data);

    return this.handle(data);
  }
}
