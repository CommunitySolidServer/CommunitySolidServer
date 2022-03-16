import type { Provider } from 'oidc-provider';
import type { Interaction } from '../../../../src/identity/interaction/InteractionHandler';
import type { AccountInteractionResults } from '../../../../src/identity/interaction/InteractionUtil';
import {
  assertOidcInteraction, finishInteraction, forgetWebId,
} from '../../../../src/identity/interaction/InteractionUtil';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

jest.useFakeTimers();
jest.setSystemTime();

describe('InteractionUtil', (): void => {
  let oidcInteraction: Interaction;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = {
      lastSubmission: {
        login: {
          accountId: 'http://example.com/card#me',
        },
      },
      session: {
        cookie: 'cookie',
      },
      exp: (Date.now() / 1000) + 1234,
      returnTo: 'returnTo',
      persist: jest.fn(),
    } as any;
  });

  describe('#assertOidcInteraction', (): void => {
    it('does nothing if the interaction is defined.', async(): Promise<void> => {
      expect(assertOidcInteraction(oidcInteraction)).toBeUndefined();
    });

    it('throws an error if there is no interaction.', async(): Promise<void> => {
      try {
        assertOidcInteraction();
        // Make sure the function always errors
        expect(true).toBe(false);
      } catch (error: unknown) {
        /* eslint-disable jest/no-conditional-expect */
        expect(BadRequestHttpError.isInstance(error)).toBe(true);
        expect((error as BadRequestHttpError).message)
          .toBe('This action can only be performed as part of an OIDC authentication flow.');
        expect((error as BadRequestHttpError).errorCode).toBe('E0002');
        /* eslint-enable jest/no-conditional-expect */
      }
    });
  });

  describe('#finishInteraction', (): void => {
    const result: AccountInteractionResults = {
      account: 'accountId',
    };

    it('updates the interaction.', async(): Promise<void> => {
      await expect(finishInteraction(oidcInteraction, result, false)).resolves.toBe('returnTo');
      expect(oidcInteraction.result).toBe(result);
      expect(oidcInteraction.persist).toHaveBeenCalledTimes(1);
    });

    it('can merge the result into the interaction.', async(): Promise<void> => {
      await expect(finishInteraction(oidcInteraction, result, true)).resolves.toBe('returnTo');
      expect(oidcInteraction.result).toEqual({
        account: 'accountId',
        login: {
          accountId: 'http://example.com/card#me',
        },
      });
      expect(oidcInteraction.persist).toHaveBeenCalledTimes(1);
    });
  });

  describe('#forgetWebId', (): void => {
    let provider: jest.Mocked<Provider>;

    beforeEach(async(): Promise<void> => {
      provider = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Session: {
          find: jest.fn().mockResolvedValue({
            accountId: 'accountId',
            persist: jest.fn(),
          }),
        },
      } as any;
    });

    it('removes the accountId from the session.', async(): Promise<void> => {
      await expect(forgetWebId(provider, oidcInteraction)).resolves.toBeUndefined();
      const session = await (provider.Session.find as jest.Mock).mock.results[0].value;
      expect(session.accountId).toBeUndefined();
      expect(session.persist).toHaveBeenCalledTimes(1);
    });
  });
});
