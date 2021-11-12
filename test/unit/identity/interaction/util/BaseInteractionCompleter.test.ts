import type { Interaction } from '../../../../../src/identity/interaction/InteractionHandler';
import { BaseInteractionCompleter } from '../../../../../src/identity/interaction/util/BaseInteractionCompleter';

jest.useFakeTimers();

describe('A BaseInteractionCompleter', (): void => {
  const now = Math.floor(Date.now() / 1000);
  const webId = 'http://alice.test.com/#me';
  let oidcInteraction: jest.Mocked<Interaction>;
  let completer: BaseInteractionCompleter;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = {
      lastSubmission: {},
      exp: now + 500,
      returnTo: 'http://test.com/redirect',
      save: jest.fn(),
    } as any;

    completer = new BaseInteractionCompleter();
  });

  it('stores the correct data in the interaction.', async(): Promise<void> => {
    await expect(completer.handle({ oidcInteraction, webId, shouldRemember: true }))
      .resolves.toBe(oidcInteraction.returnTo);
    expect(oidcInteraction.result).toEqual({
      login: {
        account: webId,
        remember: true,
        ts: now,
      },
      consent: {
        rejectedScopes: [],
      },
    });
    expect(oidcInteraction.save).toHaveBeenCalledTimes(1);
    expect(oidcInteraction.save).toHaveBeenLastCalledWith(500);
  });

  it('rejects offline access if shouldRemember is false.', async(): Promise<void> => {
    await expect(completer.handle({ oidcInteraction, webId, shouldRemember: false }))
      .resolves.toBe(oidcInteraction.returnTo);
    expect(oidcInteraction.result).toEqual({
      login: {
        account: webId,
        remember: false,
        ts: now,
      },
      consent: {
        rejectedScopes: [ 'offline_access' ],
      },
    });
    expect(oidcInteraction.save).toHaveBeenCalledTimes(1);
    expect(oidcInteraction.save).toHaveBeenLastCalledWith(500);
  });
});
