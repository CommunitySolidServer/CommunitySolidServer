import { ConflictHttpError } from '../../../../../src';
import {
  CreateClientCredentialsHandler,
} from '../../../../../src/identity/interaction/client-credentials/CreateClientCredentialsHandler';
import type {
  ClientCredentialsIdRoute,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsIdRoute';
import type {
  ClientCredentials,
  ClientCredentialsStore,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import type { OwnershipValidator } from '../../../../../src/identity/ownership/OwnershipValidator';
import type { WebIdStore } from '../../../../../src/identity/interaction/webid/util/WebIdStore';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';

const uuid = '4c9b88c1-7502-4107-bb79-2a3a590c7aa3';
jest.mock('uuid', (): any => ({ v4: (): string => uuid }));

describe('A CreateClientCredentialsHandler', (): void => {
  const webId = 'http://example.com/card#me';
  const id = 'id';
  const accountId = 'accountId;';
  const label = 'token_123';
  const secret = 'secret!';
  const token: ClientCredentials = { id, label, secret, accountId, webId };
  const resource = 'http://example.com/token';
  let ownershipValidator: jest.Mocked<OwnershipValidator>;
  let route: jest.Mocked<ClientCredentialsIdRoute>;
  let webIdStore: jest.Mocked<WebIdStore>;
  let clientCredentialsStore: jest.Mocked<ClientCredentialsStore>;
  let handler: CreateClientCredentialsHandler;

  beforeEach(async(): Promise<void> => {
    route = {
      getPath: jest.fn().mockReturnValue(resource),
      matchPath: jest.fn().mockReturnValue({ accountId, clientCredentialsId: id }),
    };

    ownershipValidator = {
      handleSafe: jest.fn(),
    } satisfies Partial<OwnershipValidator> as any;

    webIdStore = {
      isLinked: jest.fn().mockResolvedValue(true),
    } satisfies Partial<WebIdStore> as any;

    clientCredentialsStore = {
      create: jest.fn().mockResolvedValue({ id, secret }),
      findByAccount: jest.fn().mockResolvedValue([ token ]),
      findByLabel: jest.fn(),
    } satisfies Partial<ClientCredentialsStore> as any;

    handler = new CreateClientCredentialsHandler(webIdStore, clientCredentialsStore, route, ownershipValidator);
  });

  it('shows the required fields and known tokens.', async(): Promise<void> => {
    await expect(handler.getView({ accountId } as any)).resolves.toEqual({
      json: {
        clientCredentials: {
          [label]: resource,
        },
        fields: {
          name: { required: false, type: 'string' },
          webId: { required: true, type: 'string' },
        },
      },
    });
    expect(clientCredentialsStore.findByAccount).toHaveBeenCalledTimes(1);
    expect(clientCredentialsStore.findByAccount).toHaveBeenLastCalledWith(accountId);
  });

  describe('string ClientId', (): void => {
    it('creates a new token based on the provided settings.', async(): Promise<void> => {
      const json = { webId, name: 'token' };
      const name = `${json.name}_${uuid}`;
      await expect(handler.handle({ accountId, json } as any)).resolves.toEqual({
        json: { id: name, secret, resource },
      });
      expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
      expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
      expect(clientCredentialsStore.create).toHaveBeenCalledTimes(1);
      expect(clientCredentialsStore.create).toHaveBeenLastCalledWith(name, webId, accountId);
      expect(route.getPath).toHaveBeenCalledTimes(1);
      expect(route.getPath).toHaveBeenLastCalledWith({ accountId, clientCredentialsId: id });
    });

    it('allows token names to be undefined.', async(): Promise<void> => {
      const name = `_${uuid}`;
      await expect(handler.handle({ accountId, json: { webId }} as any))
        .resolves.toEqual({
          json: { id: name, secret, resource },
        });
      expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
      expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
      expect(clientCredentialsStore.create).toHaveBeenCalledTimes(1);
      expect(clientCredentialsStore.create).toHaveBeenLastCalledWith(name, webId, accountId);
      expect(route.getPath).toHaveBeenCalledTimes(1);
      expect(route.getPath).toHaveBeenLastCalledWith({ accountId, clientCredentialsId: id });
    });

    it('allows token names to be empty strings.', async(): Promise<void> => {
      const json = { webId, name: '' };
      const name = `_${uuid}`;
      await expect(handler.handle({ accountId, json } as any))
        .resolves.toEqual({
          json: { id: name, secret, resource },
        });
      expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
      expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
      expect(clientCredentialsStore.create).toHaveBeenCalledTimes(1);
      expect(clientCredentialsStore.create).toHaveBeenLastCalledWith(name, webId, accountId);
      expect(route.getPath).toHaveBeenCalledTimes(1);
      expect(route.getPath).toHaveBeenLastCalledWith({ accountId, clientCredentialsId: id });
    });

    it('errors if the account is not the owner of the WebID.', async(): Promise<void> => {
      const json = { webId, name: 'token' };
      webIdStore.isLinked.mockResolvedValueOnce(false);
      await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(BadRequestHttpError);
      expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
      expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
      expect(clientCredentialsStore.create).toHaveBeenCalledTimes(0);
    });
  });

  describe('URL ClientId', (): void => {
    it('errors if token with clientId already exists.', async(): Promise<void> => {
      const json = { webId, name: 'https://client.example' };
      clientCredentialsStore.findByLabel.mockResolvedValueOnce(token);
      await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(ConflictHttpError);
      expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
      expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
      expect(clientCredentialsStore.create).toHaveBeenCalledTimes(0);
    });

    it('calls the ownership validator.', async(): Promise<void> => {
      const clientId = 'https://client.example';
      const json = { webId, name: clientId };
      await expect(handler.handle({ accountId, json } as any)).resolves.toEqual({
        json: { id: clientId, secret, resource },
      });
      expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
      expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId: clientId });
      expect(clientCredentialsStore.create).toHaveBeenCalledTimes(1);
      expect(clientCredentialsStore.create).toHaveBeenLastCalledWith(clientId, webId, accountId);
      expect(route.getPath).toHaveBeenCalledTimes(1);
      expect(route.getPath).toHaveBeenLastCalledWith({ accountId, clientCredentialsId: id });
    });
  });
});
