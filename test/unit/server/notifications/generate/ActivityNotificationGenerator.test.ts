import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import {
  ActivityNotificationGenerator,
} from '../../../../../src/server/notifications/generate/ActivityNotificationGenerator';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import type { ETagHandler } from '../../../../../src/storage/conditions/ETagHandler';
import type { ResourceStore } from '../../../../../src/storage/ResourceStore';
import { AS, CONTENT_TYPE, DC, LDP, RDF } from '../../../../../src/util/Vocabularies';

describe('An ActivityNotificationGenerator', (): void => {
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const channel: NotificationChannel = {
    id: 'id',
    topic: topic.path,
    type: 'type',
  };
  const activity = AS.terms.Update;
  const metadata = new RepresentationMetadata({
    [RDF.type]: LDP.terms.Resource,
    // Needed for ETag
    [DC.modified]: new Date().toISOString(),
    [CONTENT_TYPE]: 'text/turtle',
  });
  let store: jest.Mocked<ResourceStore>;
  let eTagHandler: jest.Mocked<ETagHandler>;
  let generator: ActivityNotificationGenerator;

  beforeEach(async(): Promise<void> => {
    store = {
      getRepresentation: jest.fn().mockResolvedValue(new BasicRepresentation('', metadata)),
    } as any;

    eTagHandler = {
      getETag: jest.fn().mockReturnValue('ETag'),
      matchesETag: jest.fn(),
      sameResourceState: jest.fn(),
    };

    generator = new ActivityNotificationGenerator(store, eTagHandler);
  });

  it('only handles defined activities.', async(): Promise<void> => {
    await expect(generator.canHandle({ topic, channel })).rejects.toThrow('Only defined activities are supported.');
    await expect(generator.canHandle({ topic, channel, activity })).resolves.toBeUndefined();
  });

  it('generates a notification.', async(): Promise<void> => {
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
      type: 'Update',
      object: 'http://example.com/foo',
      state: 'ETag',
      published: date,
    });

    jest.useRealTimers();
  });
});
