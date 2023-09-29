import type { Readable, TransformCallback, TransformOptions } from 'stream';
import { Transform } from 'stream';
import { RangeNotSatisfiedHttpError } from './errors/RangeNotSatisfiedHttpError';
import { pipeSafely } from './StreamUtil';

/**
 * A stream that slices a part out of another stream.
 * `start` and `end` are inclusive.
 * If `end` is not defined it is until the end of the stream.
 * Does not support negative `start` values which would indicate slicing the end of the stream off,
 * since we don't know the length of the input stream.
 *
 * Both object and non-object streams are supported.
 * This needs to be explicitly specified,
 * as the class makes no assumptions based on the object mode of the source stream.
 */
export class SliceStream extends Transform {
  protected readonly source: Readable;
  protected remainingSkip: number;
  protected remainingRead: number;

  public constructor(source: Readable, options: TransformOptions & { start: number; end?: number }) {
    super(options);
    const end = options.end ?? Number.POSITIVE_INFINITY;
    if (options.start < 0) {
      throw new RangeNotSatisfiedHttpError('Slicing data at the end of a stream is not supported.');
    }
    if (options.start >= end) {
      throw new RangeNotSatisfiedHttpError('Range start should be less than end.');
    }
    this.remainingSkip = options.start;
    // End value is inclusive
    this.remainingRead = end - options.start + 1;

    this.source = source;
    pipeSafely(source, this);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
    this.source.pause();
    if (this.writableObjectMode) {
      this.objectSlice(chunk);
    } else {
      this.binarySlice(chunk);
    }
    // eslint-disable-next-line callback-return
    callback();
    this.source.resume();
  }

  protected binarySlice(chunk: Buffer): void {
    let length = chunk.length;
    if (this.remainingSkip > 0) {
      chunk = chunk.slice(this.remainingSkip);
      this.remainingSkip -= length - chunk.length;
      length = chunk.length;
    }
    if (length > 0 && this.remainingSkip <= 0) {
      chunk = chunk.slice(0, this.remainingRead);
      this.push(chunk);
      this.remainingRead -= length;
      this.checkEnd();
    }
  }

  protected objectSlice(chunk: unknown): void {
    if (this.remainingSkip > 0) {
      this.remainingSkip -= 1;
    } else {
      this.remainingRead -= 1;
      this.push(chunk);
      this.checkEnd();
    }
  }

  /**
   * Stop piping the source stream and close everything once the slice is finished.
   */
  protected checkEnd(): void {
    if (this.remainingRead <= 0) {
      this.source.unpipe();
      this.end();
      this.source.destroy();
    }
  }
}
