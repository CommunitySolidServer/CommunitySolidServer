import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import {
  AddRemoveNotificationGenerator,
} from '../../../../../src/server/notifications/generate/AddRemoveNotificationGenerator';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import type { ETagHandler } from '../../../../../src/storage/conditions/ETagHandler';
import type { ResourceStore } from '../../../../../src/storage/ResourceStore';
import { AS, CONTENT_TYPE, DC, LDP, RDF } from '../../../../../src/util/Vocabularies';

describe('An AddRemoveNotificationGenerator', (): void => {
  const topic: ResourceIdentifier = { path: 'http://example.com/' };
  const object: ResourceIdentifier = { path: 'http://example.com/foo' };
  const channel: NotificationChannel = {
    id: 'id',
    topic: topic.path,
    type: 'type',
  };
  let metadata: RepresentationMetadata;
  let store: jest.Mocked<ResourceStore>;
  let eTagHandler: jest.Mocked<ETagHandler>;
  let generator: AddRemoveNotificationGenerator;

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata(topic, { [AS.object]: object.path });

    const responseMetadata = new RepresentationMetadata({
      [RDF.type]: LDP.terms.Resource,
      // Needed for ETag
      [DC.modified]: new Date().toISOString(),
      [CONTENT_TYPE]: 'text/turtle',
    });
    store = {
      getRepresentation: jest.fn().mockResolvedValue(new BasicRepresentation('', responseMetadata)),
    } as any;

    eTagHandler = {
      getETag: jest.fn().mockReturnValue('ETag'),
      matchesETag: jest.fn(),
      sameResourceState: jest.fn(),
    };

    generator = new AddRemoveNotificationGenerator(store, eTagHandler);
  });

  it('only handles Add/Remove activities.', async(): Promise<void> => {
    await expect(generator.canHandle({ topic, channel, metadata }))
      .rejects.toThrow('Only Add/Remove activity updates are supported.');
    await expect(generator.canHandle({ topic, channel, metadata, activity: AS.terms.Add })).resolves.toBeUndefined();
    await expect(generator.canHandle({ topic, channel, metadata, activity: AS.terms.Remove })).resolves.toBeUndefined();
  });

  it('requires one object metadata to be present.', async(): Promise<void> => {
    metadata = new RepresentationMetadata();
    await expect(generator.handle({ topic, channel, activity: AS.terms.Add })).rejects.toThrow(
      'Missing as:object metadata for https://www.w3.org/ns/activitystreams#Add activity on http://example.com/',
    );
    await expect(generator.handle({ topic, channel, metadata, activity: AS.terms.Add })).rejects.toThrow(
      'Missing as:object metadata for https://www.w3.org/ns/activitystreams#Add activity on http://example.com/',
    );

    metadata = new RepresentationMetadata(topic, { [AS.object]: [ object.path, 'http://example.com/otherObject' ]});
    await expect(generator.handle({ topic, channel, metadata, activity: AS.terms.Add })).rejects.toThrow(
      'Found more than one as:object for https://www.w3.org/ns/activitystreams#Add activity on http://example.com/',
    );
  });

  it('generates a notification.', async(): Promise<void> => {
    const date = '1988-03-09T14:48:00.000Z';
    const ms = Date.parse(date);
    jest.useFakeTimers();
    jest.setSystemTime(ms);

    await expect(generator.handle({ topic, channel, metadata, activity: AS.terms.Add })).resolves.toEqual({
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        'https://www.w3.org/ns/solid/notification/v1',
      ],
      id: `urn:${ms}:http://example.com/`,
      type: 'Add',
      object: 'http://example.com/foo',
      target: 'http://example.com/',
      state: 'ETag',
      published: date,
    });

    jest.useRealTimers();
  });
});
