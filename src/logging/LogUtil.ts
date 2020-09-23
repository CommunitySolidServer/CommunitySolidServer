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
export const getLoggerFor = (loggable: string | Instance): Logger => LazyLoggerFactory
  .getInstance().createLogger(typeof loggable === 'string' ? loggable : loggable.constructor.name);

/**
 * Sets the global logger factory.
 * This will cause all loggers created by {@link getLoggerFor} to be delegated to a logger from the given factory.
 * @param loggerFactory - A logger factory, of undefined for unsetting it.
 */
export const setGlobalLoggerFactory = (loggerFactory: LoggerFactory | undefined): void => LazyLoggerFactory
  .getInstance().setLoggerFactory(loggerFactory);

/**
 * Helper interface to identify class instances.
 */
interface Instance {
  constructor: { name: string };
}
