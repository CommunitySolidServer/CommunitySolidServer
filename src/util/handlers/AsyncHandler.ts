type Awaited<T> = T extends PromiseLike<infer U> ? U : T;
export type AsyncHandlerInput<T extends AsyncHandler<unknown, unknown>> = Parameters<T['handle']>[0];
export type AsyncHandlerOutput<T extends AsyncHandler<unknown, unknown>> = Awaited<ReturnType<T['handle']>>;

/**
 * Simple interface for classes that can potentially handle a specific kind of data asynchronously.
 */
export abstract class AsyncHandler<TIn = void, TOut = void> {
  /**
   * Checks whether the input can be handled by this class.
   * If it cannot handle the input, rejects with an error explaining why.
   *
   * @param input - Input that could potentially be handled.
   *
   * @returns A promise resolving if the input can be handled, rejecting with an Error if not.
   */
  // eslint-disable-next-line unused-imports/no-unused-vars
  public async canHandle(input: TIn): Promise<void> {
    // Support any input by default
  }

  /**
   * Handles the given input. This may only be called if {@link canHandle} did not reject.
   * When unconditionally calling both in sequence, consider {@link handleSafe} instead.
   *
   * @param input - Input that needs to be handled.
   *
   * @returns A promise resolving when handling is finished.
   */
  public abstract handle(input: TIn): Promise<TOut>;

  /**
   * Helper function that first runs {@link canHandle} followed by {@link handle}.
   * Throws the error of {@link canHandle} if the data cannot be handled,
   * or returns the result of {@link handle} otherwise.
   *
   * @param input - Input data that will be handled if it can be handled.
   *
   * @returns A promise resolving if the input can be handled, rejecting with an Error if not.
   */
  public async handleSafe(input: TIn): Promise<TOut> {
    await this.canHandle(input);
    return this.handle(input);
  }
}
