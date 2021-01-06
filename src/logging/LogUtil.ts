import { LazyLoggerFactory } from './LazyLoggerFactory';
import type { Logger } from './Logger';
import type { LoggerFactory } from './LoggerFactory';

/**
 * Gets a logger instance for the given class instance.
 *
 * The returned type of logger depends on the configured {@link LoggerFactory} in {@link Setup}.
 *
 * The following shows a typical pattern on how to create loggers:
 * ```
 * class MyClass {
 *   protected readonly logger = getLoggerFor(this);
 * }
 * ```
 * If no class is applicable, a logger can also be created as follows:
 * ```
 * const logger = getLoggerFor('MyFunction');
 * ```
 *
 * @param loggable - A class instance or a class string name.
 */
export function getLoggerFor(loggable: string | Instance): Logger {
  return LazyLoggerFactory.getInstance()
    .createLogger(typeof loggable === 'string' ? loggable : loggable.constructor.name);
}

/**
 * Sets the global logger factory.
 * This will cause all loggers created by {@link getLoggerFor} to be delegated to a logger from the given factory.
 * @param loggerFactory - A logger factory.
 */
export function setGlobalLoggerFactory(loggerFactory: LoggerFactory): void {
  LazyLoggerFactory.getInstance().loggerFactory = loggerFactory;
}

/**
 * Resets the global logger factory to undefined.
 *
 * This typically only needs to be called during testing.
 * Call this at your own risk.
 */
export function resetGlobalLoggerFactory(): void {
  LazyLoggerFactory.getInstance().resetLoggerFactory();
}

/**
 * Helper interface to identify class instances.
 */
interface Instance {
  constructor: { name: string };
}
