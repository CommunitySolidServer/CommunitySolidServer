import type { Readable } from 'stream';
import type { ModifiedResource } from '../storage/ResourceStore';
import type { Guarded } from '../util/GuardedStream';

export interface Subscription {
  type: string;
}

export interface SubscriptionHandler {
  getType: () => string;
  getResponseData: (subscription: Subscription) => Guarded<Readable> | undefined;
  subscribe: (request: any) => Subscription;
  onResourcesChanged: (resources: ModifiedResource[], subscription: Subscription) => Promise<void>;
}
