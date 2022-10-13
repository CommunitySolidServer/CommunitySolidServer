import type { InferType } from 'yup';
import type { Credentials } from '../../../../../src/authentication/Credentials';
import { AccessMode } from '../../../../../src/authorization/permissions/Permissions';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import type { Logger } from '../../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../../src/logging/LogUtil';
import type { StateHandler } from '../../../../../src/server/notifications/StateHandler';
import type {
  SubscriptionInfo,
  SubscriptionStorage,
} from '../../../../../src/server/notifications/SubscriptionStorage';
import type {
  WebHookFeatures,
} from '../../../../../src/server/notifications/WebHookSubscription2021/WebHookSubscription2021';
import {
  WebHookSubscription2021,
} from '../../../../../src/server/notifications/WebHookSubscription2021/WebHookSubscription2021';
import { IdentifierSetMultiMap } from '../../../../../src/util/map/IdentifierMap';
import { joinUrl } from '../../../../../src/util/PathUtil';
import { readableToString, readJsonStream } from '../../../../../src/util/StreamUtil';
import { flushPromises } from '../../../../util/Util';

jest.mock('../../../../../src/logging/LogUtil', (): any => {
  const logger: Logger =
    { error: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A WebHookSubscription2021', (): void => {
  const credentials: Credentials = { agent: { webId: 'http://example.org/alice' }};
  const target = 'http://example.org/somewhere-else';
  let subscription: InferType<WebHookSubscription2021['schema']>;
  const unsubscribeRoute = new AbsolutePathInteractionRoute('http://example.com/unsubscribe');
  let storage: jest.Mocked<SubscriptionStorage<WebHookFeatures>>;
  let stateHandler: jest.Mocked<StateHandler>;
  let subscriptionType: WebHookSubscription2021;

  beforeEach(async(): Promise<void> => {
    subscription = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WebHookSubscription2021',
      topic: 'https://storage.example/resource',
      target,
      state: undefined,
      expiration: undefined,
      accept: undefined,
      rate: undefined,
    };

    storage = {
      create: jest.fn((features: WebHookFeatures): SubscriptionInfo<WebHookFeatures> => ({
        id: '123',
        topic: 'http://example.com/foo',
        type: 'WebHookSubscription2021',
        lastEmit: 0,
        features,
      })),
      add: jest.fn(),
    } as any;

    stateHandler = {
      handleSafe: jest.fn(),
    } as any;

    subscriptionType = new WebHookSubscription2021(storage, unsubscribeRoute, stateHandler);
  });

  it('has the correct type.', async(): Promise<void> => {
    expect(subscriptionType.type).toBe('WebHookSubscription2021');
  });

  it('correctly parses subscriptions.', async(): Promise<void> => {
    await expect(subscriptionType.schema.isValid(subscription)).resolves.toBe(true);

    subscription.type = 'something else';
    await expect(subscriptionType.schema.isValid(subscription)).resolves.toBe(false);
  });

  it('requires Read permissions on the topic.', async(): Promise<void> => {
    await expect(subscriptionType.extractModes(subscription)).resolves
      .toEqual(new IdentifierSetMultiMap([[{ path: subscription.topic }, AccessMode.read ]]));
  });

  it('stores the info and returns a valid response when subscribing.', async(): Promise<void> => {
    const { response } = await subscriptionType.subscribe(subscription, credentials);
    expect(response.metadata.contentType).toBe('application/ld+json');
    await expect(readJsonStream(response.data)).resolves.toEqual({
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: 'WebHookSubscription2021',
      target,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      unsubscribe_endpoint: joinUrl(unsubscribeRoute.getPath(), '123'),
    });
  });

  it('errors if the credentials do not contain a WebID.', async(): Promise<void> => {
    await expect(subscriptionType.subscribe(subscription, {})).rejects
      .toThrow('A WebHookSubscription2021 subscription request needs to be authenticated with a WebID.');
  });

  it('calls the state handler once the response has been read.', async(): Promise<void> => {
    const { response, info } = await subscriptionType.subscribe(subscription, credentials);
    expect(stateHandler.handleSafe).toHaveBeenCalledTimes(0);

    // Read out data to end stream correctly
    await readableToString(response.data);

    expect(stateHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(stateHandler.handleSafe).toHaveBeenLastCalledWith({ info });
  });

  it('logs an error if something went wrong emitting the state notification.', async(): Promise<void> => {
    const logger = getLoggerFor('mock');
    stateHandler.handleSafe.mockRejectedValue(new Error('notification error'));

    const { response } = await subscriptionType.subscribe(subscription, credentials);
    expect(logger.error).toHaveBeenCalledTimes(0);

    // Read out data to end stream correctly
    await readableToString(response.data);

    await flushPromises();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith('Error emitting state notification: notification error');
  });
});
