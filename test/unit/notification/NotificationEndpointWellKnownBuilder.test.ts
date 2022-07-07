import { NotificationEndpointWellKnownBuilder } from '../../../src/notification/NotificationEndpointWellKnownBuilder';

describe('A NotificationEndpointWellKnownBuilder', (): void => {
  const expected = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    notification_endpoint: `https://example.com/subscriptions`,
  };

  it('returns the expected notification_endpoint.', async(): Promise<void> => {
    const builder = new NotificationEndpointWellKnownBuilder('https://example.com/', 'subscriptions');
    await expect(builder.getWellKnownSegment()).resolves.toMatchObject(expected);
  });
});
