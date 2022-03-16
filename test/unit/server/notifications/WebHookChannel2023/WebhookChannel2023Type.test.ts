import { DataFactory, Store } from 'n3';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import {
  RelativePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/RelativePathInteractionRoute';
import type { Logger } from '../../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../../src/logging/LogUtil';
import { CONTEXT_NOTIFICATION } from '../../../../../src/server/notifications/Notification';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import type { StateHandler } from '../../../../../src/server/notifications/StateHandler';
import type {
  WebhookChannel2023,
} from '../../../../../src/server/notifications/WebhookChannel2023/WebhookChannel2023Type';
import {
  isWebhook2023Channel,
  WebhookChannel2023Type,
} from '../../../../../src/server/notifications/WebhookChannel2023/WebhookChannel2023Type';
import { NOTIFY, RDF } from '../../../../../src/util/Vocabularies';
import quad = DataFactory.quad;
import blankNode = DataFactory.blankNode;
import namedNode = DataFactory.namedNode;

jest.mock('../../../../../src/logging/LogUtil', (): any => {
  const logger: Logger =
    { error: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

jest.mock('uuid', (): any => ({ v4: (): string => '4c9b88c1-7502-4107-bb79-2a3a590c7aa3' }));

describe('A WebhookChannel2023Type', (): void => {
  const sendTo = 'http://example.org/somewhere-else';
  const topic = 'https://storage.example/resource';
  const subject = blankNode();
  let data: Store;
  let channel: WebhookChannel2023;
  const route = new AbsolutePathInteractionRoute('http://example.com/webhooks/');
  const webIdRoute = new RelativePathInteractionRoute(route, '/webid', false);
  let stateHandler: jest.Mocked<StateHandler>;
  let channelType: WebhookChannel2023Type;

  beforeEach(async(): Promise<void> => {
    data = new Store();
    data.addQuad(quad(subject, RDF.terms.type, NOTIFY.terms.WebhookChannel2023));
    data.addQuad(quad(subject, NOTIFY.terms.topic, namedNode(topic)));
    data.addQuad(quad(subject, NOTIFY.terms.sendTo, namedNode(sendTo)));

    const id = 'http://example.com/webhooks/4c9b88c1-7502-4107-bb79-2a3a590c7aa3';
    channel = {
      id,
      type: NOTIFY.WebhookChannel2023,
      topic: 'https://storage.example/resource',
      sendTo,
    };

    stateHandler = {
      handleSafe: jest.fn(),
    } as any;

    channelType = new WebhookChannel2023Type(route, webIdRoute, stateHandler);
  });

  it('exposes a utility function to verify if a channel is a webhook channel.', async(): Promise<void> => {
    expect(isWebhook2023Channel(channel)).toBe(true);

    (channel as NotificationChannel).type = 'something else';
    expect(isWebhook2023Channel(channel)).toBe(false);
  });

  it('correctly parses notification channel bodies.', async(): Promise<void> => {
    await expect(channelType.initChannel(data)).resolves.toEqual(channel);
  });

  it('adds the WebID when generating a JSON-LD representation of a channel.', async(): Promise<void> => {
    await expect(channelType.toJsonLd(channel)).resolves.toEqual({
      '@context': [
        CONTEXT_NOTIFICATION,
      ],
      id: channel.id,
      type: NOTIFY.WebhookChannel2023,
      sendTo,
      topic,
      sender: 'http://example.com/webhooks/webid',
    });
  });

  it('calls the state handler once the channel is completed.', async(): Promise<void> => {
    await channelType.completeChannel(channel);
    expect(stateHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(stateHandler.handleSafe).toHaveBeenLastCalledWith({ channel });
  });

  it('logs an error if something went wrong emitting the state notification.', async(): Promise<void> => {
    const logger = getLoggerFor('mock');
    stateHandler.handleSafe.mockRejectedValue(new Error('notification error'));

    await channelType.completeChannel(channel);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith('Error emitting state notification: notification error');
  });
});
