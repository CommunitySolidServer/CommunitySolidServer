import type { Operation } from '../../../../src/http/Operation';
import { ResetResponseDescription } from '../../../../src/http/output/response/ResetResponseDescription';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import type { NotificationChannelStorage } from '../../../../src/server/notifications/NotificationChannelStorage';
import { NotificationUnsubscriber } from '../../../../src/server/notifications/NotificationUnsubscriber';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';

describe('A NotificationUnsubscriber', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let operation: Operation;
  let storage: jest.Mocked<NotificationChannelStorage>;
  let unsubscriber: NotificationUnsubscriber;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'DELETE',
      target: { path: 'http://example.com/.notifications/channeltype/134' },
      preferences: {},
      body: new BasicRepresentation(),
    };

    storage = {
      delete: jest.fn().mockResolvedValue(true),
    } as any;

    unsubscriber = new NotificationUnsubscriber(storage);
  });

  it('rejects if the id does not match any stored channel.', async(): Promise<void> => {
    storage.delete.mockResolvedValue(false);
    await expect(unsubscriber.handle({ operation, request, response })).rejects.toThrow(NotFoundHttpError);
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith('http://example.com/.notifications/channeltype/134');
  });

  it('deletes the corresponding channel.', async(): Promise<void> => {
    await expect(unsubscriber.handle({ operation, request, response }))
      .resolves.toEqual(new ResetResponseDescription());
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith('http://example.com/.notifications/channeltype/134');
  });
});
