import { SUBSCRIBE_SCHEMA } from '../../../../src/server/notifications/Subscription';

describe('A Subscription', (): void => {
  const validSubscription = {
    '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
    type: 'SubscriptionType',
    topic: 'http://example.com/foo',
  };

  it('requires a minimal set of values.', async(): Promise<void> => {
    await expect(SUBSCRIBE_SCHEMA.isValid(validSubscription)).resolves.toBe(true);
  });

  it('requires the notification context header to be present.', async(): Promise<void> => {
    let subscription: unknown = {
      type: 'SubscriptionType',
      topic: 'http://example.com/foo',
    };
    await expect(SUBSCRIBE_SCHEMA.isValid(subscription)).resolves.toBe(false);

    subscription = {
      '@context': [ 'wrongContext' ],
      type: 'SubscriptionType',
      topic: 'http://example.com/foo',
    };
    await expect(SUBSCRIBE_SCHEMA.isValid(subscription)).resolves.toBe(false);

    subscription = {
      '@context': [ 'contextA', 'https://www.w3.org/ns/solid/notification/v1', 'contextB' ],
      type: 'SubscriptionType',
      topic: 'http://example.com/foo',
    };
    await expect(SUBSCRIBE_SCHEMA.isValid(subscription)).resolves.toBe(true);

    subscription = {
      '@context': 'https://www.w3.org/ns/solid/notification/v1',
      type: 'SubscriptionType',
      topic: 'http://example.com/foo',
    };
    await expect(SUBSCRIBE_SCHEMA.isValid(subscription)).resolves.toBe(true);
  });

  it('converts the expiration date to a number.', async(): Promise<void> => {
    const date = '1988-03-09T14:48:00.000Z';
    const ms = Date.parse(date);

    const subscription: unknown = {
      ...validSubscription,
      expiration: date,
    };
    await expect(SUBSCRIBE_SCHEMA.validate(subscription)).resolves.toEqual(expect.objectContaining({
      expiration: ms,
    }));
  });

  it('converts the rate to a number.', async(): Promise<void> => {
    const subscription: unknown = {
      ...validSubscription,
      rate: 'PT10S',
    };
    await expect(SUBSCRIBE_SCHEMA.validate(subscription)).resolves.toEqual(expect.objectContaining({
      rate: 10 * 1000,
    }));
  });
});
