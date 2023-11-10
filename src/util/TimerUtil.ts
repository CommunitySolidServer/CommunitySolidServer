import type { Logger } from '../logging/Logger';
import { createErrorMessage } from './errors/ErrorUtil';

/**
 * Wraps the callback for {@link setInterval} so errors get caught and logged.
 * Parameters are identical to the {@link setInterval} parameters starting from the 3rd argument.
 * The logger and message will be used when the callback throws an error.
 * Supports asynchronous callback functions.
 */
export function setSafeInterval<TArgs>(
  logger: Logger,
  message: string,
  callback: (...cbArgs: TArgs[]) => Promise<void> | void,
  ms?: number,
  ...args: TArgs[]
): NodeJS.Timeout {
  async function safeCallback(...cbArgs: TArgs[]): Promise<void> {
    try {
      // We don't know if the callback is async or not so this way we make sure
      // the full function execution is done in the try block.
      return await callback(...cbArgs);
    } catch (error: unknown) {
      logger.error(`Error during interval callback: ${message} - ${createErrorMessage(error)}`);
    }
  }
  // eslint-disable-next-line ts/no-misused-promises
  return setInterval(safeCallback, ms, ...args);
}
