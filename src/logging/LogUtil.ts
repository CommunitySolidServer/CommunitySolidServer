import { LazyLoggerFactory } from './LazyLoggerFactory';
import type { Logger } from './Logger';
import type { LoggerFactory } from './LoggerFactory';

let loggerFactoryWrapper = new LazyLoggerFactory();
let classLoggers = new WeakMap<Constructor, Logger>();

/**
 * Gets a logger instance for the given class instance.
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
  let logger: Logger;
  // Create a logger with a text label
  if (typeof loggable === 'string') {
    logger = loggerFactoryWrapper.createLogger(loggable);
  // Create or reuse a logger for a specific class
  } else {
    const { constructor } = loggable;
    if (classLoggers.has(constructor)) {
      logger = classLoggers.get(constructor)!;
    } else {
      logger = loggerFactoryWrapper.createLogger(constructor.name);
      classLoggers.set(constructor, logger);
    }
  }
  return logger;
}

/**
 * Sets the global logger factory.
 * This causes loggers created by {@link getLoggerFor} to delegate to a logger from the given factory.
 *
 * @param loggerFactory - A logger factory.
 */
export function setGlobalLoggerFactory(loggerFactory: LoggerFactory): void {
  loggerFactoryWrapper.loggerFactory = loggerFactory;
}

/**
 * Resets the internal logger factory, which holds the global logger factory.
 * For testing purposes only.
 */
export function resetInternalLoggerFactory(factory = new LazyLoggerFactory()): void {
  loggerFactoryWrapper = factory;
  classLoggers = new WeakMap();
}

/**
 * Any class constructor.
 */
interface Constructor {
  name: string;
}

/**
 * Any class instance.
 */
interface Instance {
  constructor: Constructor;
}
