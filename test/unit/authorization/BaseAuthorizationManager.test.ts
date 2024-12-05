import { BaseAuthorizationManager } from '../../../src/authorization/BaseAuthorizationManager';
import type { AuxiliaryIdentifierStrategy } from '../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../../../src/util/identifiers/IdentifierStrategy';

describe('A BaseAuthorizationManager', (): void => {
  const baseUrl = 'http://example.com/';
  const resource = 'http://example.com/foo';
  const authUrl = 'http://example.com/foo/.acl';
  let identifierStrategy: jest.Mocked<IdentifierStrategy>;
  let authStrategy: jest.Mocked<AuxiliaryIdentifierStrategy>;
  let store: jest.Mocked<ResourceStore>;
  let manager: BaseAuthorizationManager;

  beforeEach(async(): Promise<void> => {
    identifierStrategy = {
      isRootContainer: jest.fn().mockReturnValue(false),
      getParentContainer: jest.fn().mockReturnValue({ path: baseUrl }),
    } as any;

    authStrategy = {
      getAuxiliaryIdentifier: jest.fn().mockReturnValue(authUrl),
    } satisfies Partial<AuxiliaryIdentifierStrategy> as any;

    store = {
      getRepresentation: jest.fn().mockResolvedValue(new BasicRepresentation('authData', { path: authUrl })),
    } satisfies Partial<ResourceStore> as any;

    manager = new BaseAuthorizationManager(identifierStrategy, authStrategy, store);
  });

  it('can return the parent identifier.', async(): Promise<void> => {
    expect(manager.getParent(resource)).toBe(baseUrl);
    expect(identifierStrategy.isRootContainer).toHaveBeenCalledTimes(1);
    expect(identifierStrategy.getParentContainer).toHaveBeenCalledTimes(1);
    expect(identifierStrategy.getParentContainer).toHaveBeenLastCalledWith({ path: resource });
  });

  it('returns undefined if there is no parent identifier.', async(): Promise<void> => {
    identifierStrategy.isRootContainer.mockReturnValueOnce(true);
    expect(manager.getParent(resource)).toBeUndefined();
    expect(identifierStrategy.isRootContainer).toHaveBeenCalledTimes(1);
    expect(identifierStrategy.getParentContainer).toHaveBeenCalledTimes(0);
  });

  it('returns the auth data.', async(): Promise<void> => {
    await expect(manager.getAuthorizationData(resource)).resolves.toEqual([ 'authData' ]);
  });

  it('returns undefined if there is no auth data.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValueOnce(new NotFoundHttpError());
    await expect(manager.getAuthorizationData(resource)).resolves.toBeUndefined();
  });

  it('throws the error if someone goes wrong accessing the data.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValueOnce(new InternalServerError());
    await expect(manager.getAuthorizationData(resource)).rejects.toThrow(InternalServerError);
  });
});
