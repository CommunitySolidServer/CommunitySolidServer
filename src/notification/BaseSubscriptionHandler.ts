import type { Readable } from 'stream';
import type { ModifiedResource } from '..';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { ModificationType } from '../storage/ResourceStore';
import type { Guarded } from '../util/GuardedStream';
import type { Subscription, SubscriptionHandler } from './SubscriptionHandler';

export abstract class BaseSubscriptionHandler
implements SubscriptionHandler {
  public abstract getResponseData(): Guarded<Readable> | undefined;
  public abstract getType(): string;
  public abstract subscribe(request: any): Subscription;
  public abstract onResourceCreated(resource: ResourceIdentifier, subscription: Subscription): void;
  public abstract onResourceChanged(resource: ResourceIdentifier, subscription: Subscription): void;
  public abstract onResourceDeleted(resource: ResourceIdentifier, subscription: Subscription): void;
  public async onResourcesChanged(resources: ModifiedResource[], subscription: Subscription): Promise<void> {
    resources.forEach((modified): void => this.onHandler(modified.modificationType)(modified.resource, subscription));
  }

  private onHandler(
    modificationType: ModificationType,
  ): ((resource: ResourceIdentifier, subscription: Subscription) => void) {
    // eslint-disable-next-line default-case
    switch (modificationType) {
      case ModificationType.created: return this.onResourceCreated;
      case ModificationType.changed: return this.onResourceChanged;
      case ModificationType.deleted: return this.onResourceDeleted;
    }
  }
}
