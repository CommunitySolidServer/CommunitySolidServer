import type { CredentialsExtractor } from '../../../../../src/authentication/CredentialsExtractor';
import type { Operation } from '../../../../../src/http/Operation';
import { ResetResponseDescription } from '../../../../../src/http/output/response/ResetResponseDescription';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import type { NotificationChannelStorage } from '../../../../../src/server/notifications/NotificationChannelStorage';

import {
  WebHookUnsubscriber,
} from '../../../../../src/server/notifications/WebHookSubscription2021/WebHookUnsubscriber';
import { ForbiddenHttpError } from '../../../../../src/util/errors/ForbiddenHttpError';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { NOTIFY } from '../../../../../src/util/Vocabularies';

describe('A WebHookUnsubscriber', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let operation: Operation;
  const webId = 'http://example.com/alice';
  let credentialsExtractor: jest.Mocked<CredentialsExtractor>;
  let storage: jest.Mocked<NotificationChannelStorage>;
  let unsubscriber: WebHookUnsubscriber;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'DELETE',
      target: { path: 'http://example.com/.notifications/webhooks/134' },
      preferences: {},
      body: new BasicRepresentation(),
    };

    credentialsExtractor = {
      handleSafe: jest.fn().mockResolvedValue({ agent: { webId }}),
    } as any;

    storage = {
      get: jest.fn().mockResolvedValue({ type: NOTIFY.WebHookSubscription2021, webId }),
      delete: jest.fn(),
    } as any;

    unsubscriber = new WebHookUnsubscriber(credentialsExtractor, storage);
  });

  it('rejects if the id does not match any stored channel.', async(): Promise<void> => {
    storage.get.mockResolvedValue(undefined);
    await expect(unsubscriber.handle({ operation, request, response })).rejects.toThrow(NotFoundHttpError);
    expect(storage.delete).toHaveBeenCalledTimes(0);
  });

  it('rejects if credentials are wrong.', async(): Promise<void> => {
    credentialsExtractor.handleSafe.mockResolvedValue({ agent: { webId: 'http://example.com/bob' }});
    await expect(unsubscriber.handle({ operation, request, response })).rejects.toThrow(ForbiddenHttpError);
    expect(storage.delete).toHaveBeenCalledTimes(0);
  });

  it('deletes the corresponding channel.', async(): Promise<void> => {
    await expect(unsubscriber.handle({ operation, request, response }))
      .resolves.toEqual(new ResetResponseDescription());
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith('http://example.com/.notifications/webhooks/134');
  });
});
