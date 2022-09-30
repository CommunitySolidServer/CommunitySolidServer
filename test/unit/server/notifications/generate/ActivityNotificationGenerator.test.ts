import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import {
  ActivityNotificationGenerator,
} from '../../../../../src/server/notifications/generate/ActivityNotificationGenerator';
import type { SubscriptionInfo } from '../../../../../src/server/notifications/SubscriptionStorage';
import type { ResourceStore } from '../../../../../src/storage/ResourceStore';
import { AS, DC, LDP, RDF } from '../../../../../src/util/Vocabularies';

describe('An ActivityNotificationGenerator', (): void => {
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const info: SubscriptionInfo = {
    id: 'id',
    topic: topic.path,
    type: 'type',
    features: {},
    lastEmit: 0,
  };
  const activity = AS.terms.Update;
  const metadata = new RepresentationMetadata({
    [RDF.type]: LDP.terms.Resource,
    // Needed for ETag
    [DC.modified]: new Date().toISOString(),
  });
  let store: jest.Mocked<ResourceStore>;
  let generator: ActivityNotificationGenerator;

  beforeEach(async(): Promise<void> => {
    store = {
      getRepresentation: jest.fn().mockResolvedValue(new BasicRepresentation('', metadata)),
    } as any;

    generator = new ActivityNotificationGenerator(store);
  });

  it('only handles defined activities.', async(): Promise<void> => {
    await expect(generator.canHandle({ topic, info })).rejects.toThrow('Only defined activities are supported.');
    await expect(generator.canHandle({ topic, info, activity })).resolves.toBeUndefined();
  });

  it('generates a notification.', async(): Promise<void> => {
    const date = '1988-03-09T14:48:00.000Z';
    const ms = Date.parse(date);
    jest.useFakeTimers();
    jest.setSystemTime(ms);

    await expect(generator.handle({ topic, info, activity })).resolves.toEqual({
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        'https://www.w3.org/ns/solid/notification/v1',
      ],
      id: `urn:${ms}:http://example.com/foo`,
      type: [ 'Update' ],
      object: {
        id: 'http://example.com/foo',
        type: [
          LDP.Resource,
        ],
      },
      state: expect.stringMatching(/"\d+"/u),
      published: date,
    });

    jest.useRealTimers();
  });
});
