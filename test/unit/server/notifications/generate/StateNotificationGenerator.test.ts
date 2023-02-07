import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import type { NotificationGenerator } from '../../../../../src/server/notifications/generate/NotificationGenerator';
import {
  StateNotificationGenerator,
} from '../../../../../src/server/notifications/generate/StateNotificationGenerator';
import type { Notification } from '../../../../../src/server/notifications/Notification';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import type { ResourceSet } from '../../../../../src/storage/ResourceSet';
import { AS } from '../../../../../src/util/Vocabularies';

describe('A StateNotificationGenerator', (): void => {
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const channel: NotificationChannel = {
    id: 'id',
    topic: topic.path,
    type: 'type',
  };
  const notification: Notification = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://www.w3.org/ns/solid/notification/v1',
    ],
    id: `urn:123:http://example.com/foo`,
    type: 'Update',
    object: 'http://example.com/foo',
    published: '123',
  };
  let source: jest.Mocked<NotificationGenerator>;
  let resourceSet: jest.Mocked<ResourceSet>;
  let generator: StateNotificationGenerator;

  beforeEach(async(): Promise<void> => {
    source = {
      handleSafe: jest.fn().mockResolvedValue(notification),
    } as any;

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };

    generator = new StateNotificationGenerator(source, resourceSet);
  });

  it('returns the source notification if there is an activity.', async(): Promise<void> => {
    await expect(generator.handle({ topic, channel, activity: AS.terms.Update })).resolves.toBe(notification);
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({ topic, channel, activity: AS.terms.Update });
    expect(resourceSet.hasResource).toHaveBeenCalledTimes(0);
  });

  it('calls the source with an Update notification if the topic exists.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValue(true);
    await expect(generator.handle({ topic, channel })).resolves.toBe(notification);
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({ topic, channel, activity: AS.terms.Update });
    expect(resourceSet.hasResource).toHaveBeenCalledTimes(1);
  });

  it('calls the source with a Delete notification if the topic does not exist.', async(): Promise<void> => {
    resourceSet.hasResource.mockResolvedValue(false);
    await expect(generator.handle({ topic, channel })).resolves.toBe(notification);
    expect(source.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.handleSafe).toHaveBeenLastCalledWith({ topic, channel, activity: AS.terms.Delete });
    expect(resourceSet.hasResource).toHaveBeenCalledTimes(1);
  });
});
