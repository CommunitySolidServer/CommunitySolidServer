import type { KoaContextWithOIDC } from 'oidc-provider';
import { AccountPromptFactory } from '../../../../src/identity/configuration/AccountPromptFactory';
import type { CookieStore } from '../../../../src/identity/interaction/account/util/CookieStore';

describe('An AccountPromptFactory', (): void => {
  let ctx: KoaContextWithOIDC;
  const accountId = 'id';
  const name = 'name';
  let store: jest.Mocked<CookieStore>;
  let factory: AccountPromptFactory;

  beforeEach(async(): Promise<void> => {
    ctx = {
      cookies: {
        get: jest.fn().mockResolvedValue(undefined),
      },
    } as any;

    store = {
      generate: jest.fn(),
      get: jest.fn().mockResolvedValue(accountId),
      delete: jest.fn(),
    };

    factory = new AccountPromptFactory(store, name);
  });

  it('generates a prompt that checks for the presence of the account cookie.', async(): Promise<void> => {
    const prompt = factory.getPrompt();
    // All new prompt have a default first check
    expect(prompt.checks).toHaveLength(2);
    const check = prompt.checks[1];
    await expect(check.check(ctx)).resolves.toBe(false);
  });

  it('returns true if there is no cookie.', async(): Promise<void> => {
    ctx.cookies.get = jest.fn();
    const check = factory.getPrompt().checks[1];
    await expect(check.check(ctx)).resolves.toBe(true);
  });

  it('returns true if there is no matching account.', async(): Promise<void> => {
    store.get.mockResolvedValueOnce(undefined);
    const check = factory.getPrompt().checks[1];
    await expect(check.check(ctx)).resolves.toBe(true);
  });
});
