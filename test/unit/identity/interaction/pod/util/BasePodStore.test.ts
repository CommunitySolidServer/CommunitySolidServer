import {
  ACCOUNT_TYPE,
  AccountLoginStorage,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import { BasePodStore } from '../../../../../../src/identity/interaction/pod/util/BasePodStore';
import type { PodManager } from '../../../../../../src/pods/PodManager';
import type { PodSettings } from '../../../../../../src/pods/settings/PodSettings';
import { InternalServerError } from '../../../../../../src/util/errors/InternalServerError';

const STORAGE_TYPE = 'pod';

describe('A BasePodStore', (): void => {
  const accountId = 'accountId';
  const id = 'id';
  const baseUrl = 'http://example.com/foo/';
  const settings: PodSettings = { webId: 'http://example.com/card#me', base: { path: baseUrl }};
  let storage: jest.Mocked<AccountLoginStorage<any>>;
  let manager: jest.Mocked<PodManager>;
  let store: BasePodStore;

  beforeEach(async(): Promise<void> => {
    storage = {
      defineType: jest.fn().mockResolvedValue({}),
      createIndex: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id, baseUrl, accountId }),
      find: jest.fn().mockResolvedValue([{ id, baseUrl, accountId }]),
      delete: jest.fn(),
    } satisfies Partial<AccountLoginStorage<any>> as any;

    manager = {
      createPod: jest.fn(),
    };

    store = new BasePodStore(storage, manager);
  });

  it('defines the type and indexes in the storage.', async(): Promise<void> => {
    await expect(store.handle()).resolves.toBeUndefined();
    expect(storage.defineType).toHaveBeenCalledTimes(1);
    expect(storage.defineType).toHaveBeenLastCalledWith(STORAGE_TYPE, {
      baseUrl: 'string',
      accountId: `id:${ACCOUNT_TYPE}`,
    }, false);
    expect(storage.createIndex).toHaveBeenCalledTimes(2);
    expect(storage.createIndex).toHaveBeenCalledWith(STORAGE_TYPE, 'accountId');
    expect(storage.createIndex).toHaveBeenCalledWith(STORAGE_TYPE, 'baseUrl');
  });

  it('can only initialize once.', async(): Promise<void> => {
    await expect(store.handle()).resolves.toBeUndefined();
    await expect(store.handle()).resolves.toBeUndefined();
    expect(storage.defineType).toHaveBeenCalledTimes(1);
  });

  it('throws an error if defining the type goes wrong.', async(): Promise<void> => {
    storage.defineType.mockRejectedValueOnce(new Error('bad data'));
    await expect(store.handle()).rejects.toThrow(InternalServerError);
  });

  it('calls the pod manager to create a pod.', async(): Promise<void> => {
    await expect(store.create(accountId, settings, false)).resolves.toBe(id);
    expect(storage.create).toHaveBeenCalledTimes(1);
    expect(storage.create).toHaveBeenLastCalledWith(STORAGE_TYPE, { accountId, baseUrl });
    expect(manager.createPod).toHaveBeenCalledTimes(1);
    expect(manager.createPod).toHaveBeenLastCalledWith(settings, false);
  });

  it('reverts the storage changes if something goes wrong.', async(): Promise<void> => {
    manager.createPod.mockRejectedValueOnce(new Error('bad data'));
    await expect(store.create(accountId, settings, false)).rejects.toThrow('Pod creation failed: bad data');
    expect(storage.create).toHaveBeenCalledTimes(1);
    expect(storage.create).toHaveBeenLastCalledWith(STORAGE_TYPE, { accountId, baseUrl });
    expect(manager.createPod).toHaveBeenCalledTimes(1);
    expect(manager.createPod).toHaveBeenLastCalledWith(settings, false);
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
  });

  it('can find all the pods for an account.', async(): Promise<void> => {
    await expect(store.findPods(accountId)).resolves.toEqual([{ id, baseUrl }]);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { accountId });
  });

  it('can find the account that created a pod.', async(): Promise<void> => {
    await expect(store.findAccount(baseUrl)).resolves.toEqual(accountId);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { baseUrl });
  });

  it('returns undefined if there is no associated account.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([]);
    await expect(store.findAccount(baseUrl)).resolves.toBeUndefined();
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { baseUrl });
  });
});
