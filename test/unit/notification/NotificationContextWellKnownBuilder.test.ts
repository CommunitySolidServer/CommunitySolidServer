import { NotificationContextWellKnownBuilder } from '../../../src/notification/NotificationContextWellKnownBuilder';
import { SOLID_NOTIFICATION } from '../../../src/util/Vocabularies';

describe('A NotificationContextWellKnownBuilder', (): void => {
  const expected = {
    '@context': [
      SOLID_NOTIFICATION.namespace,
    ],
  };

  it('returns the expected @context.', async(): Promise<void> => {
    const builder = new NotificationContextWellKnownBuilder();
    await expect(builder.getWellKnownSegment()).resolves.toMatchObject(expected);
  });
});
