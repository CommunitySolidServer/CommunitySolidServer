import type { TransformableInfo } from 'logform';
import { createLogger, format, transports } from 'winston';
import type * as Transport from 'winston-transport';
import type { Logger, LogMetadata } from './Logger';
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

  private readonly clusterInfo = (meta: LogMetadata): string => {
    if (meta.isPrimary) {
      return 'Primary';
    }
    return `W-${meta.pid ?? '???'}`;
  };

  public createLogger(label: string): Logger {
    return new WinstonLogger(createLogger({
      level: this.level,
      format: format.combine(
        format.label({ label }),
        format.colorize(),
        format.timestamp(),
        format.metadata({ fillExcept: [ 'level', 'timestamp', 'label', 'message' ]}),
        format.printf(
          ({ level: levelInner, message, label: labelInner, timestamp, metadata: meta }: TransformableInfo): string =>
          `${timestamp} [${labelInner}] {${this.clusterInfo(meta as LogMetadata)}} ${levelInner}: ${message}`,
        ),
      ),
      transports: this.createTransports(),
    }));
  }

  protected createTransports(): Transport[] {
    return [ new transports.Console() ];
  }
}
