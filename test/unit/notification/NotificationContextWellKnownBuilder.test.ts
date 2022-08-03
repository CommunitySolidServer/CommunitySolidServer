import { NotificationContextWellKnownBuilder } from '../../../src/notification/NotificationContextWellKnownBuilder';

describe('A NotificationContextWellKnownBuilder', (): void => {
  const expected = {
    '@context': [
      'https://www.w3.org/ns/solid/notification/v1',
    ],
  };

  it('returns the expected @context.', async(): Promise<void> => {
    const builder = new NotificationContextWellKnownBuilder();
    await expect(builder.getWellKnownSegment()).resolves.toMatchObject(expected);
  });
});
