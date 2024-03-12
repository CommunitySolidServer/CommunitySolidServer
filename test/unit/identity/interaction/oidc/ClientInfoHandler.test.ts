import type { ProviderFactory } from '../../../../../src/identity/configuration/ProviderFactory';
import type { Interaction } from '../../../../../src/identity/interaction/InteractionHandler';
import { ClientInfoHandler } from '../../../../../src/identity/interaction/oidc/ClientInfoHandler';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import type Provider from '../../../../../templates/types/oidc-provider';

describe('A ClientInfoHandler', (): void => {
  let oidcInteraction: Interaction;
  const clientMetadata = {
    client_id: 'clientId',
    client_name: 'clientName',
    unknownField: 'super-secret',
  };
  let provider: jest.Mocked<Provider>;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let handler: ClientInfoHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = {
      params: { client_id: 'clientId' },
      session: { accountId: 'http://example.com/card#me' },
    } as any;

    provider = {
      Client: {
        find: (id: string): any => id ? { metadata: jest.fn().mockReturnValue(clientMetadata) } : undefined,
      },
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    handler = new ClientInfoHandler(providerFactory);
  });

  it('returns the known client metadata fields.', async(): Promise<void> => {
    await expect(handler.handle({ oidcInteraction } as any)).resolves.toEqual({ json: {
      client: {
        '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',
        client_id: 'clientId',
        client_name: 'clientName',
      },
      webId: 'http://example.com/card#me',
    }});
  });

  it('returns empty info if there is none.', async(): Promise<void> => {
    delete oidcInteraction.params.client_id;
    await expect(handler.handle({ oidcInteraction } as any)).resolves.toEqual({ json: {
      client: {
        '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',
      },
      webId: 'http://example.com/card#me',
    }});
  });

  it('errors if there is no OIDC interaction.', async(): Promise<void> => {
    await expect(handler.handle({} as any)).rejects.toThrow(BadRequestHttpError);
  });
});
