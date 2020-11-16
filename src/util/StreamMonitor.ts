import type { Readable } from 'stream';
import { getLoggerFor } from '../logging/LogUtil';

/**
 * Class used to monitor streams for possible error events.
 * This can be used in cases where a stream is received as input,
 * but other async operations need to be executed before the stream is passed along.
 * At that point Node.js might start buffering the stream,
 * which can cause the server to crash since there is no error listener at that point.
 */
export class StreamMonitor {
  protected readonly logger = getLoggerFor(this);

  private readonly stream: Readable;
  private error?: Error;

  private readonly errorCb: (error: Error) => void;
  private readonly endCb: () => void;
  private released = false;

  /**
   * Creates a monitor on the given stream.
   * `name` is used for logging in case the monitor is not released before the stream ending.
   */
  public constructor(stream: Readable, name?: string) {
    this.stream = stream;

    this.errorCb = (error: Error): void => {
      this.error = error;
    };
    this.stream.on('error', this.errorCb);

    this.endCb = (): void => {
      setTimeout((): void => {
        if (!this.released) {
          this.logger.warn(`${name ?? 'unknown'} monitor was not released but stream ended`);
        }
      }, 1000);
    };
    this.stream.on('end', this.endCb);
  }

  /**
   * Releases the monitor from the stream.
   * Will throw an error if the stream emitted an error in the meantime.
   * Will also throw an error if this function is called twice.
   */
  public release(): void {
    if (this.released) {
      throw new Error('Release called more than once');
    }
    this.released = true;

    // Remove listeners to prevent unneeded event calls
    this.stream.removeListener('error', this.errorCb);
    this.stream.removeListener('end', this.endCb);

    if (this.error) {
      throw this.error;
    }
  }
}
