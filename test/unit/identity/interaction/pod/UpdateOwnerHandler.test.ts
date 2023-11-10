import type { PodIdRoute } from '../../../../../src/identity/interaction/pod/PodIdRoute';
import { UpdateOwnerHandler } from '../../../../../src/identity/interaction/pod/UpdateOwnerHandler';
import type { PodStore } from '../../../../../src/identity/interaction/pod/util/PodStore';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';

describe('An UpdateOwnerHandler', (): void => {
  const id = 'id';
  const accountId = 'accountId';
  const baseUrl = 'http://example.com/profile/';
  const webId = 'http://example.org/profile/card#me';
  const target = { path: 'http://example.org/account/pod/123/' };
  let store: jest.Mocked<PodStore>;
  let route: jest.Mocked<PodIdRoute>;
  let handler: UpdateOwnerHandler;

  beforeEach(async(): Promise<void> => {
    store = {
      get: jest.fn().mockResolvedValue({ baseUrl, accountId }),
      getOwners: jest.fn().mockResolvedValue([{ webId, visible: true }]),
      updateOwner: jest.fn(),
      removeOwner: jest.fn(),
    } satisfies Partial<PodStore> as any;

    route = {
      getPath: jest.fn().mockReturnValue(''),
      matchPath: jest.fn().mockReturnValue({ accountId, podId: id }),
    };

    handler = new UpdateOwnerHandler(store, route);
  });

  it('requires specific input fields and returns all owners.', async(): Promise<void> => {
    await expect(handler.getView({ accountId, target } as any)).resolves.toEqual({
      json: {
        baseUrl,
        owners: [{ webId, visible: true }],
        fields: {
          webId: { required: true, type: 'string' },
          visible: { required: false, type: 'boolean' },
          remove: { required: false, type: 'boolean' },
        },
      },
    });
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
    expect(store.getOwners).toHaveBeenCalledTimes(1);
    expect(store.getOwners).toHaveBeenLastCalledWith(id);
  });

  it('can update the owner visibility.', async(): Promise<void> => {
    await expect(handler.handle({ accountId, target, json: { webId, visible: true }} as any))
      .resolves.toEqual({ json: {}});
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
    expect(store.updateOwner).toHaveBeenCalledTimes(1);
    expect(store.updateOwner).toHaveBeenLastCalledWith(id, webId, true);
    expect(store.removeOwner).toHaveBeenCalledTimes(0);
  });

  it('can remove an owner.', async(): Promise<void> => {
    await expect(handler.handle({ accountId, target, json: { webId, remove: true }} as any))
      .resolves.toEqual({ json: {}});
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
    expect(store.updateOwner).toHaveBeenCalledTimes(0);
    expect(store.removeOwner).toHaveBeenCalledTimes(1);
    expect(store.removeOwner).toHaveBeenLastCalledWith(id, webId);
  });

  it('throws a 404 if the authenticated accountId is not the owner.', async(): Promise<void> => {
    await expect(handler.handle({ target, json: { webId, remove: true }, accountId: 'otherId' } as any))
      .rejects.toThrow(NotFoundHttpError);
    expect(store.get).toHaveBeenCalledTimes(1);
    expect(store.get).toHaveBeenLastCalledWith(id);
    expect(store.updateOwner).toHaveBeenCalledTimes(0);
    expect(store.removeOwner).toHaveBeenCalledTimes(0);
  });
});
