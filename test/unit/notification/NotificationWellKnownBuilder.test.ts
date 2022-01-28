import { NotificationWellKnownBuilder } from '../../../src/notification/NotificationWellKnownBuilder';

describe('A NotificationWellKnownBuilder', (): void => {
  it('returns the expected notification endpoint as json-ld for well formed urls.', async(): Promise<void> => {
    const notificationWellKnownBuilder = new NotificationWellKnownBuilder({
      baseUrl: 'http://server/',
      notificationEndpointPath: 'notif',
    });
    const expected = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      // eslint-disable-next-line @typescript-eslint/naming-convention
      notification_endpoint: 'http://server/notif',
    };
    expect(await notificationWellKnownBuilder.getWellKnownSegment()).toEqual(expected);
  });
  it('returns the expected notification endpoint as json-ld for well strange urls.', async(): Promise<void> => {
    const notificationWellKnownBuilder = new NotificationWellKnownBuilder({
      baseUrl: 'https://server/',
      notificationEndpointPath: '/services/notif/',
    });
    const expected = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      // eslint-disable-next-line @typescript-eslint/naming-convention
      notification_endpoint: 'https://server/services/notif',
    };
    expect(await notificationWellKnownBuilder.getWellKnownSegment()).toEqual(expected);
  });
});
