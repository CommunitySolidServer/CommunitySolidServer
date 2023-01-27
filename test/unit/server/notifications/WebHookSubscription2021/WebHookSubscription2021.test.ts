import { DataFactory, Store } from 'n3';
import type { Credentials } from '../../../../../src/authentication/Credentials';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import type { Logger } from '../../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../../src/logging/LogUtil';
import { CONTEXT_NOTIFICATION } from '../../../../../src/server/notifications/Notification';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import type { StateHandler } from '../../../../../src/server/notifications/StateHandler';
import type {
  WebHookSubscription2021Channel,
} from '../../../../../src/server/notifications/WebHookSubscription2021/WebHookSubscription2021';
import {
  isWebHook2021Channel,
  WebHookSubscription2021,
} from '../../../../../src/server/notifications/WebHookSubscription2021/WebHookSubscription2021';
import { joinUrl } from '../../../../../src/util/PathUtil';
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

describe('A WebHookSubscription2021', (): void => {
  const credentials: Credentials = { agent: { webId: 'http://example.org/alice' }};
  const target = 'http://example.org/somewhere-else';
  const topic = 'https://storage.example/resource';
  const subject = blankNode();
  let data: Store;
  let channel: WebHookSubscription2021Channel;
  const unsubscribeRoute = new AbsolutePathInteractionRoute('http://example.com/unsubscribe');
  let stateHandler: jest.Mocked<StateHandler>;
  let channelType: WebHookSubscription2021;

  beforeEach(async(): Promise<void> => {
    data = new Store();
    data.addQuad(quad(subject, RDF.terms.type, NOTIFY.terms.WebHookSubscription2021));
    data.addQuad(quad(subject, NOTIFY.terms.topic, namedNode(topic)));
    data.addQuad(quad(subject, NOTIFY.terms.target, namedNode(target)));

    const id = '4c9b88c1-7502-4107-bb79-2a3a590c7aa3:https://storage.example/resource';
    channel = {
      id,
      type: NOTIFY.WebHookSubscription2021,
      topic: 'https://storage.example/resource',
      target,
      webId: 'http://example.org/alice',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      unsubscribe_endpoint: joinUrl(unsubscribeRoute.getPath(), encodeURIComponent(id)),
    };

    stateHandler = {
      handleSafe: jest.fn(),
    } as any;

    channelType = new WebHookSubscription2021(unsubscribeRoute, stateHandler);
  });

  it('exposes a utility function to verify if a channel is a webhook channel.', async(): Promise<void> => {
    expect(isWebHook2021Channel(channel)).toBe(true);

    (channel as NotificationChannel).type = 'something else';
    expect(isWebHook2021Channel(channel)).toBe(false);
  });

  it('correctly parses notification channel bodies.', async(): Promise<void> => {
    await expect(channelType.initChannel(data, credentials)).resolves.toEqual(channel);
  });

  it('errors if the credentials do not contain a WebID.', async(): Promise<void> => {
    await expect(channelType.initChannel(data, {})).rejects
      .toThrow('A WebHookSubscription2021 subscription request needs to be authenticated with a WebID.');
  });

  it('removes the WebID when converting back to JSON-LD.', async(): Promise<void> => {
    await expect(channelType.toJsonLd(channel)).resolves.toEqual({
      '@context': [
        CONTEXT_NOTIFICATION,
      ],
      id: channel.id,
      type: NOTIFY.WebHookSubscription2021,
      target,
      topic,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      unsubscribe_endpoint: channel.unsubscribe_endpoint,
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
