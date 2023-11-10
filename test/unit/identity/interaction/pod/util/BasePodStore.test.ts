import type {
  AccountLoginStorage,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import {
  ACCOUNT_TYPE,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import { BasePodStore } from '../../../../../../src/identity/interaction/pod/util/BasePodStore';
import type { PodManager } from '../../../../../../src/pods/PodManager';
import type { PodSettings } from '../../../../../../src/pods/settings/PodSettings';
import { BadRequestHttpError } from '../../../../../../src/util/errors/BadRequestHttpError';
import { InternalServerError } from '../../../../../../src/util/errors/InternalServerError';

const STORAGE_TYPE = 'pod';
const OWNER_TYPE = 'owner';

describe('A BasePodStore', (): void => {
  const accountId = 'accountId';
  const id = 'id';
  const baseUrl = 'http://example.com/foo/';
  const webId = 'http://example.com/card#me';
  const settings: PodSettings = { webId, base: { path: baseUrl }};
  let storage: jest.Mocked<AccountLoginStorage<any>>;
  let manager: jest.Mocked<PodManager>;
  let store: BasePodStore;

  beforeEach(async(): Promise<void> => {
    storage = {
      defineType: jest.fn().mockResolvedValue({}),
      createIndex: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id, baseUrl, accountId }),
      get: jest.fn().mockResolvedValue({ id, baseUrl, accountId }),
      find: jest.fn().mockResolvedValue([{ id, baseUrl, accountId }]),
      setField: jest.fn(),
      delete: jest.fn(),
    } satisfies Partial<AccountLoginStorage<any>> as any;

    manager = {
      createPod: jest.fn(),
    };

    store = new BasePodStore(storage, manager);
  });

  it('defines the type and indexes in the storage.', async(): Promise<void> => {
    await expect(store.handle()).resolves.toBeUndefined();
    expect(storage.defineType).toHaveBeenCalledTimes(2);
    expect(storage.defineType).toHaveBeenCalledWith(STORAGE_TYPE, {
      baseUrl: 'string',
      accountId: `id:${ACCOUNT_TYPE}`,
    }, false);
    expect(storage.defineType).toHaveBeenCalledWith(OWNER_TYPE, {
      webId: 'string',
      visible: 'boolean',
      podId: `id:${STORAGE_TYPE}`,
    }, false);
    expect(storage.createIndex).toHaveBeenCalledTimes(3);
    expect(storage.createIndex).toHaveBeenCalledWith(STORAGE_TYPE, 'accountId');
    expect(storage.createIndex).toHaveBeenCalledWith(STORAGE_TYPE, 'baseUrl');
    expect(storage.createIndex).toHaveBeenCalledWith(OWNER_TYPE, 'podId');
  });

  it('can only initialize once.', async(): Promise<void> => {
    await expect(store.handle()).resolves.toBeUndefined();
    await expect(store.handle()).resolves.toBeUndefined();
    expect(storage.defineType).toHaveBeenCalledTimes(2);
  });

  it('throws an error if defining the type goes wrong.', async(): Promise<void> => {
    storage.defineType.mockRejectedValueOnce(new Error('bad data'));
    await expect(store.handle()).rejects.toThrow(InternalServerError);
  });

  it('calls the pod manager to create a pod.', async(): Promise<void> => {
    await expect(store.create(accountId, settings, false)).resolves.toBe(id);
    expect(storage.create).toHaveBeenCalledTimes(2);
    expect(storage.create).toHaveBeenNthCalledWith(1, STORAGE_TYPE, { accountId, baseUrl });
    expect(storage.create).toHaveBeenNthCalledWith(2, OWNER_TYPE, { podId: id, webId, visible: false });
    expect(manager.createPod).toHaveBeenCalledTimes(1);
    expect(manager.createPod).toHaveBeenLastCalledWith(settings, false);
  });

  it('reverts the storage changes if something goes wrong.', async(): Promise<void> => {
    manager.createPod.mockRejectedValueOnce(new Error('bad data'));
    await expect(store.create(accountId, settings, false)).rejects.toThrow('Pod creation failed: bad data');
    expect(storage.create).toHaveBeenCalledTimes(2);
    expect(storage.create).toHaveBeenNthCalledWith(1, STORAGE_TYPE, { accountId, baseUrl });
    expect(storage.create).toHaveBeenNthCalledWith(2, OWNER_TYPE, { podId: id, webId, visible: false });
    expect(manager.createPod).toHaveBeenCalledTimes(1);
    expect(manager.createPod).toHaveBeenLastCalledWith(settings, false);
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
  });

  it('returns the pod information.', async(): Promise<void> => {
    await expect(store.get(id)).resolves.toEqual({ baseUrl, accountId });
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
  });

  it('returns undefined if there is no matching pod.', async(): Promise<void> => {
    storage.get.mockResolvedValueOnce(undefined);
    await expect(store.get(id)).resolves.toBeUndefined();
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
  });

  it('can find all the pods for an account.', async(): Promise<void> => {
    await expect(store.findPods(accountId)).resolves.toEqual([{ id, baseUrl }]);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { accountId });
  });

  it('can find the account that created a pod.', async(): Promise<void> => {
    await expect(store.findByBaseUrl(baseUrl)).resolves.toEqual({ accountId, id });
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { baseUrl });
  });

  it('returns undefined if there is no associated account.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([]);
    await expect(store.findByBaseUrl(baseUrl)).resolves.toBeUndefined();
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { baseUrl });
  });

  it('can return all the owners of a pod.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([{ id: 'id1', webId, visible: true }]);
    await expect(store.getOwners(id)).resolves.toEqual([{ webId, visible: true }]);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(OWNER_TYPE, { podId: id });
  });

  it('returns undefined if there are no owners.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([]);
    await expect(store.getOwners(id)).resolves.toBeUndefined();
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(OWNER_TYPE, { podId: id });
  });

  it('creates a new owner if the update target does not exist yet.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([]);
    await expect(store.updateOwner(id, webId, true)).resolves.toBeUndefined();
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(OWNER_TYPE, { podId: id, webId });
    expect(storage.create).toHaveBeenCalledTimes(1);
    expect(storage.create).toHaveBeenLastCalledWith(OWNER_TYPE, { podId: id, webId, visible: true });
    expect(storage.setField).toHaveBeenCalledTimes(0);
  });

  it('updates the existing object if there already is an owner with this WebID.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([{ id: 'id1', webId, visible: false }]);
    await expect(store.updateOwner(id, webId, true)).resolves.toBeUndefined();
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(OWNER_TYPE, { podId: id, webId });
    expect(storage.create).toHaveBeenCalledTimes(0);
    expect(storage.setField).toHaveBeenCalledTimes(1);
    expect(storage.setField).toHaveBeenLastCalledWith(OWNER_TYPE, 'id1', 'visible', true);
  });

  it('can remove an owner.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([
      { id: 'id1', webId, visible: false },
      { id: 'id2', webId: 'otherWebId', visible: false },
    ]);
    await expect(store.removeOwner(id, webId)).resolves.toBeUndefined();
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(OWNER_TYPE, { podId: id });
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith(OWNER_TYPE, 'id1');
  });

  it('does nothing if there is no matching owner.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([{ id: 'id2', webId: 'otherWebId', visible: false }]);
    await expect(store.removeOwner(id, webId)).resolves.toBeUndefined();
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(OWNER_TYPE, { podId: id });
    expect(storage.delete).toHaveBeenCalledTimes(0);
  });

  it('cannot remove the last owner.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([{ id: 'id1', webId, visible: false }]);
    await expect(store.removeOwner(id, webId)).rejects.toThrow(BadRequestHttpError);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(OWNER_TYPE, { podId: id });
    expect(storage.delete).toHaveBeenCalledTimes(0);
  });
});
