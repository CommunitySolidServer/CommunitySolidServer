import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { CookieStore } from '../../../../../src/identity/interaction/account/util/CookieStore';
import { LogoutHandler } from '../../../../../src/identity/interaction/login/LogoutHandler';
import { SOLID_HTTP } from '../../../../../src/util/Vocabularies';

describe('A LogoutHandler', (): void => {
  const accountId = 'accountId';
  const cookie = 'cookie';
  let metadata: RepresentationMetadata;
  let cookieStore: jest.Mocked<CookieStore>;
  let handler: LogoutHandler;

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata({ [SOLID_HTTP.accountCookie]: cookie });

    cookieStore = {
      get: jest.fn().mockResolvedValue(accountId),
      delete: jest.fn(),
    } as any;

    handler = new LogoutHandler(cookieStore);
  });

  it('removes the cookie and sets the relevant metadata.', async(): Promise<void> => {
    const { json, metadata: outputMetadata } = await handler.handle({ metadata, accountId } as any);
    expect(json).toEqual({});
    expect(outputMetadata?.get(SOLID_HTTP.terms.accountCookie)?.value).toBe(cookie);
    const date = outputMetadata?.get(SOLID_HTTP.terms.accountCookieExpiration);
    expect(date).toBeDefined();
    expect(new Date(date!.value).getTime()).toBeLessThan(Date.now());
    expect(cookieStore.delete).toHaveBeenCalledTimes(1);
    expect(cookieStore.delete).toHaveBeenLastCalledWith(cookie);
  });

  it('does nothing if the request is not logged in.', async(): Promise<void> => {
    metadata = new RepresentationMetadata();
    await expect(handler.handle({ metadata } as any)).resolves.toEqual({ json: {}});
    expect(cookieStore.delete).toHaveBeenCalledTimes(0);
  });

  it('errors if the cookie does not belong to the authenticated account.', async(): Promise<void> => {
    cookieStore.get.mockResolvedValueOnce('other-id');
    await expect(handler.handle({ metadata, accountId } as any)).rejects.toThrow('Invalid cookie');
    expect(cookieStore.delete).toHaveBeenCalledTimes(0);
  });
});
