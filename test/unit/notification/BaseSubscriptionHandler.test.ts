import type { Readable } from 'stream';
import { BaseSubscriptionHandler } from '../../../src/notification/BaseSubscriptionHandler';
import type { Subscription } from '../../../src/notification/Subscription';
import type { Guarded } from '../../../src/util/GuardedStream';
import { AS } from '../../../src/util/Vocabularies';

class WrappedBaseSubscriptionHandler extends BaseSubscriptionHandler<Subscription> {
  public getResponseData = (): Guarded<Readable> | undefined => undefined;
  public getType = (): string => '';
  public subscribe = (): Subscription => ({ type: '' });
  public onResourceCreated = (): void => undefined;
  public onResourceUpdated = (): void => undefined;
  public onResourceDeleted = (): void => undefined;
}

describe('A handler extending BaseSubscriptionHandler with default behaviour', (): void => {
  let handler: WrappedBaseSubscriptionHandler;
  const mockIdentifier = { path: 'http://example.com/file' };
  const mockSubscription = { type: '' };

  beforeEach((): void => {
    handler = new WrappedBaseSubscriptionHandler();
  });

  it('should call onResourceCreated when onChange was called with activity === AS.Create.', async(): Promise<void> => {
    const createdSpy = jest.spyOn(handler, 'onResourceCreated');
    await handler.onChange(mockIdentifier, AS.Create, mockSubscription);
    expect(createdSpy).toHaveBeenCalledTimes(1);
    expect(createdSpy).toHaveBeenCalledWith(mockIdentifier, mockSubscription);
  });

  it('should call onResourceUpdated when onChange was called with activity === AS.Update.', async(): Promise<void> => {
    const updatedSpy = jest.spyOn(handler, 'onResourceUpdated');
    await handler.onChange(mockIdentifier, AS.Update, mockSubscription);
    expect(updatedSpy).toHaveBeenCalledTimes(1);
    expect(updatedSpy).toHaveBeenCalledWith(mockIdentifier, mockSubscription);
  });

  it('should call onResourceDeleted when onChange was called with activity === AS.Delete.', async(): Promise<void> => {
    const deletedSpy = jest.spyOn(handler, 'onResourceDeleted');
    await handler.onChange(mockIdentifier, AS.Delete, mockSubscription);
    expect(deletedSpy).toHaveBeenCalledTimes(1);
    expect(deletedSpy).toHaveBeenCalledWith(mockIdentifier, mockSubscription);
  });

  it('should not call any function when activity is not in the AS namespace.', async(): Promise<void> => {
    const createdSpy = jest.spyOn(handler, 'onResourceCreated');
    const updatedSpy = jest.spyOn(handler, 'onResourceUpdated');
    const deletedSpy = jest.spyOn(handler, 'onResourceDeleted');
    await handler.onChange(mockIdentifier, 'randomString', mockSubscription);
    expect(createdSpy).toHaveBeenCalledTimes(0);
    expect(updatedSpy).toHaveBeenCalledTimes(0);
    expect(deletedSpy).toHaveBeenCalledTimes(0);
  });
});
