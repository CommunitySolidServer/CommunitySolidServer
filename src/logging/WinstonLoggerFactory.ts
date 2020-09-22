import { createLogger, format, transports } from 'winston';
import type * as Transport from 'winston-transport';
import type { Logger } from './Logger';
import type { LoggerFactory } from './LoggerFactory';
import { WinstonLogger } from './WinstonLogger';

/**
 * Uses the winston library to create loggers for the given logging level.
 * By default, it will print to the console with colorized logging levels.
 *
 * This creates instances of {@link WinstonLogger}.
 */
export class WinstonLoggerFactory implements LoggerFactory {
  private readonly level: string;

  public constructor(level: string) {
    this.level = level;
  }

  public createLogger(label: string): Logger {
    return new WinstonLogger(createLogger({
      level: this.level,
      format: format.combine(
        format.label({ label }),
        format.colorize(),
        format.timestamp(),
        format.printf(({ level: levelInner, message, label: labelInner, timestamp }: {[key: string]: any}): string =>
          `${timestamp} [${labelInner}] ${levelInner}: ${message}`),
      ),
      transports: this.createTransports(),
    }));
  }

  protected createTransports(): Transport[] {
    return [ new transports.Console() ];
  }
}
