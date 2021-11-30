/* eslint-disable no-useless-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Readable } from 'stream';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { BaseSubscriptionHandler } from '../../../src/notification/BaseSubscriptionHandler';
import type { Subscription } from '../../../src/notification/SubscriptionHandler';
import type { ModifiedResource } from '../../../src/storage/ResourceStore';
import { ModificationType, createModifiedResource } from '../../../src/storage/ResourceStore';

import type { Guarded } from '../../../src/util/GuardedStream';

class MockBaseSubscriptionHandler extends BaseSubscriptionHandler {
  public getResponseData(): Guarded<Readable> | undefined {
    return undefined;
  }

  public getType(): string {
    return '';
  }

  public subscribe(request: any): Subscription {
    return {
      type: '',
    };
  }

  public onResourceCreated(resource: ResourceIdentifier, subscription: Subscription): void {
    return;
  }

  public onResourceChanged(resource: ResourceIdentifier, subscription: Subscription): void {
    return;
  }

  public onResourceDeleted(resource: ResourceIdentifier, subscription: Subscription): void {
    return;
  }
}
describe('A handler extending BaseSubscriptionHandler with default behaviour', (): void => {
  let handler: MockBaseSubscriptionHandler;
  beforeEach(async(): Promise<void> => {
    handler = new MockBaseSubscriptionHandler();
  });
  it('shoud call onResourceCreated when resource is createdResource.', async(): Promise<void> => {
    const createdSpy = jest.spyOn(handler, 'onResourceCreated');
    const resources: ModifiedResource[] = [ createModifiedResource({ path: 'http://server/resource' }, ModificationType.created) ];
    const subscription: Subscription = { type: '' };
    await handler.onResourcesChanged(resources, subscription);
    expect(createdSpy).toHaveBeenCalledTimes(1);
  });
  it('shoud call onResourceChanged when resource is changedResource.', async(): Promise<void> => {
    const changedSpy = jest.spyOn(handler, 'onResourceChanged');
    const resources: ModifiedResource[] = [ createModifiedResource({ path: 'http://server/resource' }, ModificationType.changed) ];
    const subscription: Subscription = { type: '' };
    await handler.onResourcesChanged(resources, subscription);
    expect(changedSpy).toHaveBeenCalledTimes(1);
  });
  it('shoud call onResourceDeleted when resource is deletedResource.', async(): Promise<void> => {
    const deletedSpy = jest.spyOn(handler, 'onResourceDeleted');
    const resources: ModifiedResource[] = [ createModifiedResource({ path: 'http://server/resource' }, ModificationType.deleted) ];
    const subscription: Subscription = { type: '' };
    await handler.onResourcesChanged(resources, subscription);
    expect(deletedSpy).toHaveBeenCalledTimes(1);
  });
  it('shoud call as many notification function as expected.', async(): Promise<void> => {
    const createdSpy = jest.spyOn(handler, 'onResourceCreated');
    const changedSpy = jest.spyOn(handler, 'onResourceChanged');
    const deletedSpy = jest.spyOn(handler, 'onResourceDeleted');
    const resources: ModifiedResource[] =
    [ createModifiedResource({ path: 'http://server/resource' }, ModificationType.deleted), createModifiedResource({ path: 'http://server/' }, ModificationType.changed) ];
    const subscription: Subscription = { type: '' };
    await handler.onResourcesChanged(resources, subscription);
    expect(createdSpy).toHaveBeenCalledTimes(0);
    expect(changedSpy).toHaveBeenCalledTimes(1);
    expect(deletedSpy).toHaveBeenCalledTimes(1);
  });
});
