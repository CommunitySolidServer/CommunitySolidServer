import type { Interaction } from '../../../../src/identity/interaction/InteractionHandler';
import type { AccountInteractionResults } from '../../../../src/identity/interaction/InteractionUtil';
import {
  assertOidcInteraction,
  finishInteraction,
  forgetWebId,
} from '../../../../src/identity/interaction/InteractionUtil';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import type Provider from '../../../../templates/types/oidc-provider';

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
        Session: {
          find: jest.fn().mockResolvedValue({
            accountId: 'accountId',
            persist: jest.fn(),
          }),
        },
        Grant: {
          find: jest.fn().mockResolvedValue({
            destroy: jest.fn(),
          }),
        },
      } as any;
    });

    it('removes the accountId from the session.', async(): Promise<void> => {
      await expect(forgetWebId(provider, oidcInteraction)).resolves.toBeUndefined();
      expect(provider.Session.find).toHaveBeenCalledTimes(1);
      expect(provider.Session.find).toHaveBeenLastCalledWith('cookie');
      // eslint-disable-next-line jest/unbound-method
      const session = await jest.mocked(provider.Session.find).mock.results[0].value;
      expect(session.accountId).toBeUndefined();
      expect(session.persist).toHaveBeenCalledTimes(1);
    });

    it('deletes the grant if there is one associated to the session.', async(): Promise<void> => {
      delete oidcInteraction.session;
      oidcInteraction.grantId = 'grantId';
      await expect(forgetWebId(provider, oidcInteraction)).resolves.toBeUndefined();
      expect(provider.Grant.find).toHaveBeenCalledTimes(1);
      expect(provider.Grant.find).toHaveBeenLastCalledWith('grantId');
      // eslint-disable-next-line jest/unbound-method
      const grant = await jest.mocked(provider.Grant.find).mock.results[0].value;
      expect(grant.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
