import type { Readable } from 'stream';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { Guarded } from '../util/GuardedStream';
import { AS } from '../util/Vocabularies';
import type { Subscription } from './Subscription';
import type { SubscriptionHandler } from './SubscriptionHandler';

export abstract class BaseSubscriptionHandler<TSubscription extends Subscription>
implements SubscriptionHandler<TSubscription> {
  public abstract getResponseData(subscription: TSubscription): Guarded<Readable> | undefined;
  public abstract getType(): string;
  public abstract subscribe(request: any): TSubscription;
  public abstract onResourceCreated(resource: ResourceIdentifier, subscription: TSubscription): void;
  public abstract onResourceUpdated(resource: ResourceIdentifier, subscription: TSubscription): void;
  public abstract onResourceDeleted(resource: ResourceIdentifier, subscription: TSubscription): void;
  public async onChange(
    resource: ResourceIdentifier,
    activity: string,
    subscription: TSubscription,
  ): Promise<void> {
    switch (activity) {
      case AS.Create: return this.onResourceCreated(resource, subscription);
      case AS.Update: return this.onResourceUpdated(resource, subscription);
      case AS.Delete: return this.onResourceDeleted(resource, subscription);
      default:
    }
  }
}
