import type { ProviderFactory } from '../../../../../src/identity/configuration/ProviderFactory';
import type { Interaction } from '../../../../../src/identity/interaction/InteractionHandler';
import { ForgetWebIdHandler } from '../../../../../src/identity/interaction/oidc/ForgetWebIdHandler';
import type Provider from '../../../../../templates/types/oidc-provider';

describe('A ForgetWebIdHandler', (): void => {
  let oidcInteraction: Interaction;
  let provider: jest.Mocked<Provider>;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let handler: ForgetWebIdHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = {
      lastSubmission: { login: { accountId: 'id' }},
      persist: jest.fn(),
      session: {
        cookie: 'cookie',
      },
      returnTo: 'returnTo',
    } as any;

    provider = {
      Session: {
        find: jest.fn().mockResolvedValue({ persist: jest.fn() }),
      },
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    handler = new ForgetWebIdHandler(providerFactory);
  });

  it('forgets the WebID and updates the interaction.', async(): Promise<void> => {
    await expect(handler.handle({ oidcInteraction } as any)).rejects.toThrow(expect.objectContaining({
      statusCode: 302,
      location: 'returnTo',
    }));
  });
});
