import { Readable } from 'stream';

/**
 * Interface providing typed functions for Readable streams.
 */
export interface TypedReadable<T> extends Readable {
  read(size?: number): any;
  unshift(chunk: any, encoding?: BufferEncoding): void;
  push(chunk: any, encoding?: BufferEncoding): boolean;

  addListener(event: 'data', listener: (chunk: T) => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: 'data', chunk: T): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;

  on(event: 'data', listener: (chunk: T) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  once(event: 'data', listener: (chunk: T) => void): TypedReadable<T>;
  once(event: string | symbol, listener: (...args: any[]) => void): this;

  prependListener(event: 'data', listener: (chunk: T) => void): TypedReadable<T>;
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this;

  prependOnceListener(event: 'data', listener: (chunk: T) => void): TypedReadable<T>;
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;

  removeListener(event: 'data', listener: (chunk: T) => void): TypedReadable<T>;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;

  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}
