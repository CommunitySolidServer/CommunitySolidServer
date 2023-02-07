import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import {
  DeleteNotificationGenerator,
} from '../../../../../src/server/notifications/generate/DeleteNotificationGenerator';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import { AS } from '../../../../../src/util/Vocabularies';

describe('A DeleteNotificationGenerator', (): void => {
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const channel: NotificationChannel = {
    id: 'id',
    topic: topic.path,
    type: 'type',
  };
  const activity = AS.terms.Delete;
  const generator = new DeleteNotificationGenerator();

  it('can only handle input with the Delete activity.', async(): Promise<void> => {
    await expect(generator.canHandle({ topic, channel })).rejects
      .toThrow('Only Delete activity updates are supported.');
    await expect(generator.canHandle({ topic, channel, activity: AS.terms.Update }))
      .rejects.toThrow('Only Delete activity updates are supported.');
    await expect(generator.canHandle({ topic, channel, activity })).resolves.toBeUndefined();
  });

  it('generates a Delete notification.', async(): Promise<void> => {
    const date = '1988-03-09T14:48:00.000Z';
    const ms = Date.parse(date);
    jest.useFakeTimers();
    jest.setSystemTime(ms);

    await expect(generator.handle({ topic, channel, activity })).resolves.toEqual({
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        'https://www.w3.org/ns/solid/notification/v1',
      ],
      id: `urn:${ms}:http://example.com/foo`,
      type: 'Delete',
      object: 'http://example.com/foo',
      published: date,
    });

    jest.useRealTimers();
  });
});
