import type { Readable } from 'stream';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { Guarded } from '../util/GuardedStream';
import type { Subscription } from './Subscription';

export interface SubscriptionHandler<TSubscription extends Subscription> {
  getType: () => string;
  getResponseData: (subscription: TSubscription) => Guarded<Readable> | undefined;
  subscribe: (request: any) => TSubscription;
  onChange: (resource: ResourceIdentifier, activity: string, subscription: TSubscription) => Promise<void>;
}
