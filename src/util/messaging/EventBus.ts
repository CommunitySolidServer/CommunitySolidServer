import type { Serializable } from 'child_process';

// Could be replaced with an AsyncHandler<T extends Serializable>
export interface EventConsumer<T extends Serializable> {
  onEvent: (event: T) => Promise<void>;
}

export interface EventSubscription<T extends Serializable> {
  address: string;
  consumer: EventConsumer<T>;
  unsubscribe: () => Promise<void>;
}

/**
 * This interface defines a simple publish/subscribe component.
 */
export interface EventBus<T extends Serializable> {

  publish: (address: string, event: T) => Promise<void>;

  subscribe: (address: string, consumer: EventConsumer<T>) => Promise<EventSubscription<T>>;

}
