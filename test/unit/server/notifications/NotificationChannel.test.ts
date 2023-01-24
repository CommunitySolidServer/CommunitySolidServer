import { NOTIFICATION_CHANNEL_SCHEMA } from '../../../../src/server/notifications/NotificationChannel';

describe('A NotificationChannel', (): void => {
  const validChannel = {
    '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
    type: 'NotificationChannelType',
    topic: 'http://example.com/foo',
  };

  it('requires a minimal set of values.', async(): Promise<void> => {
    await expect(NOTIFICATION_CHANNEL_SCHEMA.isValid(validChannel)).resolves.toBe(true);
  });

  it('requires the notification context header to be present.', async(): Promise<void> => {
    let channel: unknown = {
      type: 'NotificationChannelType',
      topic: 'http://example.com/foo',
    };
    await expect(NOTIFICATION_CHANNEL_SCHEMA.isValid(channel)).resolves.toBe(false);

    channel = {
      '@context': [ 'wrongContext' ],
      type: 'NotificationChannelType',
      topic: 'http://example.com/foo',
    };
    await expect(NOTIFICATION_CHANNEL_SCHEMA.isValid(channel)).resolves.toBe(false);

    channel = {
      '@context': [ 'contextA', 'https://www.w3.org/ns/solid/notification/v1', 'contextB' ],
      type: 'NotificationChannelType',
      topic: 'http://example.com/foo',
    };
    await expect(NOTIFICATION_CHANNEL_SCHEMA.isValid(channel)).resolves.toBe(true);

    channel = {
      '@context': 'https://www.w3.org/ns/solid/notification/v1',
      type: 'NotificationChannelType',
      topic: 'http://example.com/foo',
    };
    await expect(NOTIFICATION_CHANNEL_SCHEMA.isValid(channel)).resolves.toBe(true);
  });

  it('converts the start date to a number.', async(): Promise<void> => {
    const date = '1988-03-09T14:48:00.000Z';
    const ms = Date.parse(date);

    const channel: unknown = {
      ...validChannel,
      startAt: date,
    };
    await expect(NOTIFICATION_CHANNEL_SCHEMA.validate(channel)).resolves.toEqual(expect.objectContaining({
      startAt: ms,
    }));
  });

  it('converts the end date to a number.', async(): Promise<void> => {
    const date = '1988-03-09T14:48:00.000Z';
    const ms = Date.parse(date);

    const channel: unknown = {
      ...validChannel,
      endAt: date,
    };
    await expect(NOTIFICATION_CHANNEL_SCHEMA.validate(channel)).resolves.toEqual(expect.objectContaining({
      endAt: ms,
    }));
  });

  it('converts the rate to a number.', async(): Promise<void> => {
    const channel: unknown = {
      ...validChannel,
      rate: 'PT10S',
    };
    await expect(NOTIFICATION_CHANNEL_SCHEMA.validate(channel)).resolves.toEqual(expect.objectContaining({
      rate: 10 * 1000,
    }));
  });
});
