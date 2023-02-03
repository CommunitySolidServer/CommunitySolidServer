import { DataFactory, Store } from 'n3';
import type { Credentials } from '../../../../src/authentication/Credentials';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import {
  AbsolutePathInteractionRoute,
} from '../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import { BaseChannelType, DEFAULT_NOTIFICATION_FEATURES } from '../../../../src/server/notifications/BaseChannelType';
import type { NotificationChannel } from '../../../../src/server/notifications/NotificationChannel';
import { UnprocessableEntityHttpError } from '../../../../src/util/errors/UnprocessableEntityHttpError';
import { IdentifierSetMultiMap } from '../../../../src/util/map/IdentifierMap';
import { NOTIFY, RDF, XSD } from '../../../../src/util/Vocabularies';
import namedNode = DataFactory.namedNode;
import quad = DataFactory.quad;
import blankNode = DataFactory.blankNode;
import literal = DataFactory.literal;

jest.mock('uuid', (): any => ({ v4: (): string => '4c9b88c1-7502-4107-bb79-2a3a590c7aa3' }));

const dummyType = namedNode('http://example.com/DummyType');
class DummyChannelType extends BaseChannelType {
  public constructor(features?: string[], properties?: unknown[]) {
    super(
      dummyType,
      new AbsolutePathInteractionRoute('http://example.com/DummyType/'),
      features,
      properties,
    );
  }
}

describe('A BaseChannelType', (): void => {
  const id = 'http://example.com/DummyType/4c9b88c1-7502-4107-bb79-2a3a590c7aa3';
  const credentials: Credentials = {};
  const channelType = new DummyChannelType();

  it('can provide a description of the subscription service.', async(): Promise<void> => {
    expect(channelType.getDescription()).toEqual({
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      id: 'http://example.com/DummyType/',
      channelType: dummyType.value,
      feature: [ 'accept', 'endAt', 'rate', 'startAt', 'state' ],
    });
  });

  it('can configure specific features.', async(): Promise<void> => {
    const otherChannelType = new DummyChannelType([ 'notify:accept' ]);
    expect(otherChannelType.getDescription()).toEqual({
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      id: 'http://example.com/DummyType/',
      channelType: dummyType.value,
      feature: [ 'accept' ],
    });
  });

  it('uses the notify prefix for non-default features in the namespace.', async(): Promise<void> => {
    const otherChannelType = new DummyChannelType([ `${NOTIFY.namespace}feat1`, 'http://example.com/feat2' ]);
    expect(otherChannelType.getDescription()).toEqual({
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      id: 'http://example.com/DummyType/',
      channelType: dummyType.value,
      feature: [
        'notify:feat1',
        'http://example.com/feat2',
      ],
    });
  });

  describe('#initChannel', (): void => {
    let data: Store;
    const subject = blankNode();
    beforeEach(async(): Promise<void> => {
      data = new Store();
      data.addQuad(quad(subject, RDF.terms.type, dummyType));
      data.addQuad(quad(subject, NOTIFY.terms.topic, namedNode('https://storage.example/resource')));
    });

    it('converts the quads to a channel with an identifier.', async(): Promise<void> => {
      await expect(channelType.initChannel(data, credentials)).resolves.toEqual({
        id,
        type: dummyType.value,
        topic: 'https://storage.example/resource',
      });
    });

    it('requires exactly 1 topic.', async(): Promise<void> => {
      data.addQuad(quad(subject, NOTIFY.terms.topic, namedNode('https://storage.example/resource2')));
      await expect(channelType.initChannel(data, credentials)).rejects.toThrow(UnprocessableEntityHttpError);

      data.removeQuads(data.getQuads(subject, NOTIFY.terms.topic, null, null));
      expect(data.size).toBe(1);
      await expect(channelType.initChannel(data, credentials)).rejects.toThrow(UnprocessableEntityHttpError);

      // Data is correct again now
      data.addQuad(quad(subject, NOTIFY.terms.topic, namedNode('https://storage.example/resource')));
      await expect(channelType.initChannel(data, credentials)).resolves.toBeDefined();

      // Also make sure we can't have 2 different subjects with 1 topic each
      data.addQuad(quad(blankNode(), NOTIFY.terms.topic, namedNode('https://storage.example/resource2')));
      await expect(channelType.initChannel(data, credentials)).rejects.toThrow(UnprocessableEntityHttpError);
    });

    it('requires the correct type.', async(): Promise<void> => {
      data = new Store();
      data.addQuad(quad(subject, NOTIFY.terms.topic, namedNode('https://storage.example/resource')));
      await expect(channelType.initChannel(data, credentials)).rejects.toThrow(UnprocessableEntityHttpError);

      data.addQuad(quad(subject, RDF.terms.type, namedNode('http://example.com/wrongType')));
      await expect(channelType.initChannel(data, credentials)).rejects.toThrow(UnprocessableEntityHttpError);

      data.addQuad(quad(subject, RDF.terms.type, dummyType));
      await expect(channelType.initChannel(data, credentials)).rejects.toThrow(UnprocessableEntityHttpError);

      data.removeQuads(data.getQuads(subject, RDF.terms.type, namedNode('http://example.com/wrongType'), null));
      data.addQuad(quad(subject, RDF.terms.type, dummyType));
      await expect(channelType.initChannel(data, credentials)).resolves.toBeDefined();
    });

    it('converts the start date to a number.', async(): Promise<void> => {
      const date = '1988-03-09T14:48:00.000Z';
      const ms = Date.parse(date);

      data.addQuad(quad(subject, NOTIFY.terms.startAt, literal(date, XSD.terms.dateTime)));
      await expect(channelType.initChannel(data, credentials)).resolves.toEqual(expect.objectContaining({
        startAt: ms,
      }));
    });

    it('converts the end date to a number.', async(): Promise<void> => {
      const date = '1988-03-09T14:48:00.000Z';
      const ms = Date.parse(date);

      data.addQuad(quad(subject, NOTIFY.terms.endAt, literal(date, XSD.terms.dateTime)));
      await expect(channelType.initChannel(data, credentials)).resolves.toEqual(expect.objectContaining({
        endAt: ms,
      }));
    });

    it('converts the rate to a number.', async(): Promise<void> => {
      data.addQuad(quad(subject, NOTIFY.terms.rate, literal('PT10S', XSD.terms.duration)));
      await expect(channelType.initChannel(data, credentials)).resolves.toEqual(expect.objectContaining({
        rate: 10 * 1000,
      }));
    });

    it('removes features from the input that are not supported.', async(): Promise<void> => {
      const date = '1988-03-09T14:48:00.000Z';

      data.addQuad(quad(subject, NOTIFY.terms.startAt, literal(date, XSD.terms.dateTime)));
      data.addQuad(quad(subject, NOTIFY.terms.endAt, literal(date, XSD.terms.dateTime)));
      data.addQuad(quad(subject, NOTIFY.terms.rate, literal('PT10S', XSD.terms.duration)));
      data.addQuad(quad(subject, NOTIFY.terms.accept, literal('text/turtle')));
      data.addQuad(quad(subject, NOTIFY.terms.state, literal('123456')));

      const featChannelType = new DummyChannelType([ 'notify:endAt', 'notify:accept', NOTIFY.state ]);
      await expect(featChannelType.initChannel(data, credentials)).resolves.toEqual({
        id,
        type: dummyType.value,
        topic: 'https://storage.example/resource',
        endAt: Date.parse(date),
        accept: 'text/turtle',
        state: '123456',
      });
    });

    it('requires correct datatypes on the features.', async(): Promise<void> => {
      for (const feature of DEFAULT_NOTIFICATION_FEATURES) {
        const badData = new Store(data.getQuads(null, null, null, null));
        // No feature accepts an integer
        badData.addQuad(quad(subject, namedNode(feature), literal(123456, XSD.terms.integer)));
        await expect(channelType.initChannel(badData, credentials)).rejects.toThrow(UnprocessableEntityHttpError);
      }
    });

    it('requires that features occur at most once.', async(): Promise<void> => {
      const values = {
        [NOTIFY.startAt]: [
          literal('1988-03-09T14:48:00.000Z', XSD.terms.dateTime),
          literal('2023-03-09T14:48:00.000Z', XSD.terms.dateTime),
        ],
        [NOTIFY.endAt]: [
          literal('1988-03-09T14:48:00.000Z', XSD.terms.dateTime),
          literal('2023-03-09T14:48:00.000Z', XSD.terms.dateTime),
        ],
        [NOTIFY.rate]: [ literal('PT10S', XSD.terms.duration), literal('PT11S', XSD.terms.duration) ],
        [NOTIFY.accept]: [ literal('text/turtle'), literal('application/ld+json') ],
        [NOTIFY.state]: [ literal('123456'), literal('654321') ],
      };

      for (const [ predicate, objects ] of Object.entries(values)) {
        const badData = new Store(data.getQuads(null, null, null, null));
        badData.addQuad(quad(subject, namedNode(predicate), objects[0]));
        // One entry is fine
        await expect(channelType.initChannel(badData, credentials)).resolves.toBeDefined();
        badData.addQuad(quad(subject, namedNode(predicate), objects[1]));
        await expect(channelType.initChannel(badData, credentials)).rejects.toThrow(UnprocessableEntityHttpError);
      }
    });
  });

  it('can convert a notification channel to a JSON-LD representation.', async(): Promise<void> => {
    const startDate = '1988-03-09T14:48:00.000Z';
    const endDate = '2022-03-09T14:48:00.000Z';
    const channel: NotificationChannel = {
      id,
      type: 'DummyType',
      topic: 'https://storage.example/resource',
      state: 'state',
      startAt: Date.parse(startDate),
      endAt: Date.parse(endDate),
      rate: 10 * 1000,
      accept: 'text/turtle',
      lastEmit: 123456789,
    };

    await expect(channelType.toJsonLd(channel)).resolves.toEqual({
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      id: channel.id,
      type: channel.type,
      topic: channel.topic,
      state: channel.state,
      startAt: startDate,
      endAt: endDate,
      rate: 'PT10S',
      accept: channel.accept,
    });
  });

  it('requires read permissions on the topic.', async(): Promise<void> => {
    const channel: NotificationChannel = {
      id,
      type: 'DummyType',
      topic: 'https://storage.example/resource',
    };
    await expect(channelType.extractModes(channel)).resolves
      .toEqual(new IdentifierSetMultiMap([[{ path: channel.topic }, AccessMode.read ]]));
  });

  it('does nothing when completing the channel.', async(): Promise<void> => {
    const channel: NotificationChannel = {
      id,
      type: 'DummyType',
      topic: 'https://storage.example/resource',
    };
    await expect(channelType.completeChannel(channel)).resolves.toBeUndefined();
  });
});
