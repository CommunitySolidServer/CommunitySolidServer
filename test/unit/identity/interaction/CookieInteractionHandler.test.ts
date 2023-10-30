import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type {
  AccountStore,
} from '../../../../src/identity/interaction/account/util/AccountStore';
import {
  ACCOUNT_SETTINGS_REMEMBER_LOGIN,
} from '../../../../src/identity/interaction/account/util/AccountStore';
import type { CookieStore } from '../../../../src/identity/interaction/account/util/CookieStore';
import { CookieInteractionHandler } from '../../../../src/identity/interaction/CookieInteractionHandler';
import type { JsonRepresentation } from '../../../../src/identity/interaction/InteractionUtil';
import type {
  JsonInteractionHandler,
  JsonInteractionHandlerInput,
} from '../../../../src/identity/interaction/JsonInteractionHandler';
import { SOLID_HTTP } from '../../../../src/util/Vocabularies';

describe('A CookieInteractionHandler', (): void => {
  const date = new Date();
  const accountId = 'accountId';
  const cookie = 'cookie';
  const target: ResourceIdentifier = { path: 'http://example.com/foo' };
  let input: JsonInteractionHandlerInput;
  let output: JsonRepresentation;
  let source: jest.Mocked<JsonInteractionHandler>;
  let accountStore: jest.Mocked<AccountStore>;
  let cookieStore: jest.Mocked<CookieStore>;
  let handler: CookieInteractionHandler;

  beforeEach(async(): Promise<void> => {
    input = {
      method: 'GET',
      json: {},
      metadata: new RepresentationMetadata({ [SOLID_HTTP.accountCookie]: cookie }),
      target,
    };

    output = {
      json: {},
      metadata: new RepresentationMetadata(),
    };

    accountStore = {
      getSetting: jest.fn().mockResolvedValue(true),
    } satisfies Partial<AccountStore> as any;

    cookieStore = {
      get: jest.fn().mockResolvedValue(accountId),
      refresh: jest.fn().mockResolvedValue(date),
    } satisfies Partial<CookieStore> as any;

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(output),
    } as any;

    handler = new CookieInteractionHandler(source, accountStore, cookieStore);
  });

  it('can handle input its source can handle.', async(): Promise<void> => {
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenCalledTimes(1);
    expect(source.canHandle).toHaveBeenLastCalledWith(input);

    source.canHandle.mockRejectedValueOnce(new Error('bad data'));
    await expect(handler.canHandle(input)).rejects.toThrow('bad data');
    expect(source.canHandle).toHaveBeenCalledTimes(2);
    expect(source.canHandle).toHaveBeenLastCalledWith(input);
  });

  it('refreshes the cookie and sets its expiration metadata if required.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toEqual(output);
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
    expect(cookieStore.get).toHaveBeenCalledTimes(1);
    expect(cookieStore.get).toHaveBeenLastCalledWith(cookie);
    expect(accountStore.getSetting).toHaveBeenCalledTimes(1);
    expect(accountStore.getSetting).toHaveBeenLastCalledWith(accountId, ACCOUNT_SETTINGS_REMEMBER_LOGIN);
    expect(cookieStore.refresh).toHaveBeenCalledTimes(1);
    expect(cookieStore.refresh).toHaveBeenLastCalledWith(cookie);
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookie)?.value).toBe(cookie);
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookieExpiration)?.value).toBe(date.toISOString());
  });

  it('creates a new metadata output object if there was none.', async(): Promise<void> => {
    delete output.metadata;
    await expect(handler.handle(input)).resolves.toEqual(output);
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
    expect(cookieStore.get).toHaveBeenCalledTimes(1);
    expect(cookieStore.get).toHaveBeenLastCalledWith(cookie);
    expect(accountStore.getSetting).toHaveBeenCalledTimes(1);
    expect(accountStore.getSetting).toHaveBeenLastCalledWith(accountId, ACCOUNT_SETTINGS_REMEMBER_LOGIN);
    expect(cookieStore.refresh).toHaveBeenCalledTimes(1);
    expect(cookieStore.refresh).toHaveBeenLastCalledWith(cookie);
    // Typescript things the typing of this is `never` since we deleted it above
    expect((output.metadata as any).get(SOLID_HTTP.terms.accountCookie)?.value).toBe(cookie);
    expect((output.metadata as any).get(SOLID_HTTP.terms.accountCookieExpiration)?.value).toBe(date.toISOString());
  });

  it('uses the output cookie over the input cookie if there is one.', async(): Promise<void> => {
    output.metadata!.set(SOLID_HTTP.terms.accountCookie, 'other-cookie');
    await expect(handler.handle(input)).resolves.toEqual(output);
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookie)?.value).toBe('other-cookie');
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookieExpiration)?.value).toBe(date.toISOString());
  });

  it('adds no cookie metadata if there is no cookie.', async(): Promise<void> => {
    input.metadata.removeAll(SOLID_HTTP.terms.accountCookie);
    await expect(handler.handle(input)).resolves.toEqual(output);
    expect(cookieStore.get).toHaveBeenCalledTimes(0);
    expect(accountStore.getSetting).toHaveBeenCalledTimes(0);
    expect(cookieStore.refresh).toHaveBeenCalledTimes(0);
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookie)).toBeUndefined();
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookieExpiration)).toBeUndefined();
  });

  it('adds no cookie metadata if the output metadata already has expiration metadata.', async(): Promise<void> => {
    output.metadata!.set(SOLID_HTTP.terms.accountCookie, 'other-cookie');
    output.metadata!.set(SOLID_HTTP.terms.accountCookieExpiration, date.toISOString());
    await expect(handler.handle(input)).resolves.toEqual(output);
    expect(cookieStore.get).toHaveBeenCalledTimes(0);
    expect(accountStore.getSetting).toHaveBeenCalledTimes(0);
    expect(cookieStore.refresh).toHaveBeenCalledTimes(0);
  });

  it('adds no cookie metadata if no account ID was found.', async(): Promise<void> => {
    cookieStore.get.mockResolvedValue(undefined);
    await expect(handler.handle(input)).resolves.toEqual(output);
    expect(cookieStore.get).toHaveBeenCalledTimes(1);
    expect(cookieStore.get).toHaveBeenLastCalledWith(cookie);
    expect(accountStore.getSetting).toHaveBeenCalledTimes(0);
    expect(cookieStore.refresh).toHaveBeenCalledTimes(0);
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookie)).toBeUndefined();
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookieExpiration)).toBeUndefined();
  });

  it('adds no cookie metadata if the account does not want to be remembered.', async(): Promise<void> => {
    accountStore.getSetting.mockResolvedValueOnce(false);
    await expect(handler.handle(input)).resolves.toEqual(output);
    expect(cookieStore.get).toHaveBeenCalledTimes(1);
    expect(cookieStore.get).toHaveBeenLastCalledWith(cookie);
    expect(accountStore.getSetting).toHaveBeenCalledTimes(1);
    expect(accountStore.getSetting).toHaveBeenLastCalledWith(accountId, ACCOUNT_SETTINGS_REMEMBER_LOGIN);
    expect(cookieStore.refresh).toHaveBeenCalledTimes(0);
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookie)).toBeUndefined();
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookieExpiration)).toBeUndefined();
  });

  it('adds no cookie metadata if the refresh action returns no value.', async(): Promise<void> => {
    cookieStore.refresh.mockResolvedValue(undefined);
    await expect(handler.handle(input)).resolves.toEqual(output);
    expect(cookieStore.get).toHaveBeenCalledTimes(1);
    expect(cookieStore.get).toHaveBeenLastCalledWith(cookie);
    expect(accountStore.getSetting).toHaveBeenCalledTimes(1);
    expect(accountStore.getSetting).toHaveBeenLastCalledWith(accountId, ACCOUNT_SETTINGS_REMEMBER_LOGIN);
    expect(cookieStore.refresh).toHaveBeenCalledTimes(1);
    expect(cookieStore.refresh).toHaveBeenLastCalledWith(cookie);
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookie)).toBeUndefined();
    expect(output.metadata?.get(SOLID_HTTP.terms.accountCookieExpiration)).toBeUndefined();
  });
});
