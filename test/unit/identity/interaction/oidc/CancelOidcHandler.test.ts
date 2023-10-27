import type { Interaction } from '../../../../../src/identity/interaction/InteractionHandler';
import { CancelOidcHandler } from '../../../../../src/identity/interaction/oidc/CancelOidcHandler';

describe('A CancelOidcHandler', (): void => {
  let oidcInteraction: Interaction;
  let handler: CancelOidcHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = {
      lastSubmission: { login: { accountId: 'id' }},
      persist: jest.fn(),
      session: {
        cookie: 'cookie',
      },
      returnTo: 'returnTo',
    } as any;

    handler = new CancelOidcHandler();
  });

  it('finishes the interaction with an error.', async(): Promise<void> => {
    await expect(handler.handle({ oidcInteraction } as any)).rejects.toThrow(expect.objectContaining({
      statusCode: 302,
      location: 'returnTo',
    }));
    expect(oidcInteraction.persist).toHaveBeenCalledTimes(1);
    expect(oidcInteraction.result).toEqual({
      error: 'access_denied',
      error_description: 'User cancelled the interaction.',
    });
  });
});
