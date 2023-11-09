import { interactionPolicy } from 'oidc-provider';
import type { KoaContextWithOIDC } from 'oidc-provider';
import { AccountPromptFactory } from '../../../../src/identity/configuration/AccountPromptFactory';
import type { CookieStore } from '../../../../src/identity/interaction/account/util/CookieStore';
import type { WebIdStore } from '../../../../src/identity/interaction/webid/util/WebIdStore';
import DefaultPolicy = interactionPolicy.DefaultPolicy;
import Prompt = interactionPolicy.Prompt;

describe('An AccountPromptFactory', (): void => {
  let ctx: KoaContextWithOIDC;
  let policy: jest.Mocked<DefaultPolicy>;
  const webId = 'http://example.com/card#me';
  const accountId = 'id';
  const name = 'name';
  let webIdStore: jest.Mocked<WebIdStore>;
  let cookieStore: jest.Mocked<CookieStore>;
  let factory: AccountPromptFactory;

  beforeEach(async(): Promise<void> => {
    policy = [] as any;
    // eslint-disable-next-line jest/prefer-spy-on
    policy.add = jest.fn();
    // eslint-disable-next-line jest/prefer-spy-on
    policy.get = jest.fn().mockReturnValue(new Prompt({ name: 'login' }));

    ctx = {
      cookies: {
        get: jest.fn().mockResolvedValue(undefined),
      },
      oidc: {
        internalAccountId: webId,
        session: {
          accountId: webId,
        },
      },
    } as any;

    webIdStore = {
      isLinked: jest.fn().mockResolvedValue(true),
    } satisfies Partial<WebIdStore> as any;

    cookieStore = {
      get: jest.fn().mockResolvedValue(accountId),
    } satisfies Partial<CookieStore> as any;

    factory = new AccountPromptFactory(webIdStore, cookieStore, name);
  });

  describe('account prompt', (): void => {
    it('generates a prompt that checks for the presence of the account cookie.', async(): Promise<void> => {
      await expect(factory.handle(policy)).resolves.toBeUndefined();
      expect(policy.add).toHaveBeenCalledTimes(1);
      expect(policy.add).toHaveBeenLastCalledWith(expect.any(Prompt), 0);
      const prompt = policy.add.mock.calls[0][0];
      // The first check is added automatically because the prompt is requestable
      expect(prompt.checks).toHaveLength(2);
      const check = prompt.checks[1];
      await expect(check.check(ctx)).resolves.toBe(false);
    });

    it('returns true if there is no cookie.', async(): Promise<void> => {
      jest.spyOn(ctx.cookies, 'get').mockImplementation();
      await expect(factory.handle(policy)).resolves.toBeUndefined();
      const prompt = policy.add.mock.calls[0][0];
      const check = prompt.checks[1];
      await expect(check.check(ctx)).resolves.toBe(true);
    });

    it('returns true if there is no matching account.', async(): Promise<void> => {
      cookieStore.get.mockResolvedValueOnce(undefined);
      jest.spyOn(ctx.cookies, 'get').mockImplementation();
      await expect(factory.handle(policy)).resolves.toBeUndefined();
      const prompt = policy.add.mock.calls[0][0];
      const check = prompt.checks[1];
      await expect(check.check(ctx)).resolves.toBe(true);
    });
  });

  describe('WebID verification check', (): void => {
    it('generates a check that checks if the active account owns the chosen WebID.', async(): Promise<void> => {
      await expect(factory.handle(policy)).resolves.toBeUndefined();
      expect(policy.get).toHaveBeenCalledTimes(1);
      expect(policy.get).toHaveBeenLastCalledWith('login');
      const prompt = policy.get.mock.results[0].value;
      const check = prompt.checks[0];
      await expect(check.check(ctx)).resolves.toBe(false);
    });

    it('triggers if the account does not own the WebID.', async(): Promise<void> => {
      webIdStore.isLinked.mockResolvedValueOnce(false);
      await expect(factory.handle(policy)).resolves.toBeUndefined();
      const prompt = policy.get.mock.results[0].value;
      const check = prompt.checks[0];
      await expect(check.check(ctx)).resolves.toBe(true);
    });

    it('does not trigger if there is no session with an accountId.', async(): Promise<void> => {
      delete (ctx.oidc as any).session;
      await expect(factory.handle(policy)).resolves.toBeUndefined();
      const prompt = policy.get.mock.results[0].value;
      const check = prompt.checks[0];
      await expect(check.check(ctx)).resolves.toBe(false);
    });

    it('does not trigger if there is no internal account ID in the context.', async(): Promise<void> => {
      delete (ctx.oidc as any).internalAccountId;
      await expect(factory.handle(policy)).resolves.toBeUndefined();
      const prompt = policy.get.mock.results[0].value;
      const check = prompt.checks[0];
      await expect(check.check(ctx)).resolves.toBe(false);
    });

    it('errors if the login prompt could not be found.', async(): Promise<void> => {
      policy.get.mockReturnValue(undefined);
      await expect(factory.handle(policy)).rejects.toThrow('Missing default login policy');
    });
  });
});
