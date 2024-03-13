import { EventEmitter } from 'node:events';

/**
 * A typed interface of {@link EventEmitter}.
 *
 * Use the `&` operator to combine multiple event/function pairs into a single event emitter.
 * The result needs to be a type and not an interface because of https://github.com/microsoft/TypeScript/issues/16936.
 *
 * Use the {@link createGenericEventEmitterClass} function to generate an event emitter class with the correct typings
 * in case {@link EventEmitter} needs to be extended.
 */
// eslint-disable-next-line ts/no-explicit-any
export interface GenericEventEmitter<TEvent extends string | symbol, TFunc extends (...args: any[]) => void>
  extends EventEmitter {
  addListener: (event: TEvent, listener: TFunc) => this;
  on: (event: TEvent, listener: TFunc) => this;
  once: (event: TEvent, listener: TFunc) => this;
  removeListener: (event: TEvent, listener: TFunc) => this;
  off: (event: TEvent, listener: TFunc) => this;
  removeAllListeners: (event: TEvent) => this;
  listeners: (event: TEvent) => TFunc[];
  rawListeners: (event: TEvent) => TFunc[];
  emit: (event: TEvent, ...args: Parameters<TFunc>) => boolean;
  listenerCount: (event: TEvent) => number;
  prependListener: (event: TEvent, listener: TFunc) => this;
  prependOnceListener: (event: TEvent, listener: TFunc) => this;
  eventNames: () => TEvent[];
}

/**
 * Creates a class that is an implementation of {@link EventEmitter}
 * but with specific typings based on {@link GenericEventEmitter}.
 * Useful in case a class needs to extend {@link EventEmitter} and wants specific internal typings.
 */
export function createGenericEventEmitterClass<T extends EventEmitter>(): (new() => T) {
  return EventEmitter as unknown as new() => T;
}
