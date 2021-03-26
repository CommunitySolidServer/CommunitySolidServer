import type { AdapterPayload } from 'oidc-provider';
import type { ExpiringStorageAdapter } from '../../../../src/identity/storage/ExpiringStorageAdapterFactory';
import {
  ExpiringStorageAdapterFactory,
} from '../../../../src/identity/storage/ExpiringStorageAdapterFactory';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import type { ExpiringStorage } from '../../../../src/storage/keyvalue/ExpiringStorage';

describe('An ExpiringStorageAdapterFactory', (): void => {
  const baseUrl = 'http://test.com/foo/';
  const storagePathname = 'storage';
  const name = 'nnaammee';
  const id = 'id!';
  const grantId = 'grantId!';
  let payload: AdapterPayload;
  let storage: ExpiringStorage<ResourceIdentifier, unknown>;
  let adapter: ExpiringStorageAdapter;
  let factory: ExpiringStorageAdapterFactory;
  // Make sure this stays consistent in tests
  const now = Date.now();
  const expiresIn = 333;
  const expireDate = new Date(now + (expiresIn * 1000));

  beforeEach(async(): Promise<void> => {
    Date.now = jest.fn().mockReturnValue(now);

    payload = { data: 'data!' };

    const map = new Map<string, any>();
    storage = {
      get: jest.fn().mockImplementation((rid: ResourceIdentifier): any => map.get(rid.path)),
      set: jest.fn().mockImplementation((rid: ResourceIdentifier, value: any): any => map.set(rid.path, value)),
      delete: jest.fn().mockImplementation((rid: ResourceIdentifier): any => map.delete(rid.path)),
    } as any;

    factory = new ExpiringStorageAdapterFactory({ baseUrl, storagePathname, storage });
    adapter = factory.createStorageAdapter(name);
  });

  it('can find payload by id.', async(): Promise<void> => {
    await expect(adapter.upsert(id, payload, 333)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), payload, expireDate);
    await expect(adapter.find(id)).resolves.toBe(payload);
  });

  it('can store payloads without expiration time.', async(): Promise<void> => {
    await expect(adapter.upsert(id, payload)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), payload, undefined);
  });

  it('can find payload by userCode.', async(): Promise<void> => {
    const userCode = 'userCode!';
    payload.userCode = userCode;
    await expect(adapter.upsert(id, payload, 333)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), payload, expireDate);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), id, expireDate);
    await expect(adapter.findByUserCode(userCode)).resolves.toBe(payload);
  });

  it('can find payload by uid.', async(): Promise<void> => {
    const uid = 'uid!';
    payload.uid = uid;
    await expect(adapter.upsert(id, payload, 333)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), payload, expireDate);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), id, expireDate);
    await expect(adapter.findByUid(uid)).resolves.toBe(payload);
  });

  it('can revoke by grantId.', async(): Promise<void> => {
    payload.grantId = grantId;
    await expect(adapter.upsert(id, payload, 333)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), payload, expireDate);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), [ expect.anything() ], expireDate);
    await expect(adapter.find(id)).resolves.toBe(payload);
    await expect(adapter.revokeByGrantId(grantId)).resolves.toBeUndefined();
    expect(storage.delete).toHaveBeenCalledTimes(2);
    await expect(adapter.find(id)).resolves.toBeUndefined();
  });

  it('does not do anything if revokeByGrantId finds no matching grant.', async(): Promise<void> => {
    await expect(adapter.revokeByGrantId(grantId)).resolves.toBeUndefined();
    expect(storage.delete).toHaveBeenCalledTimes(0);
  });

  it('can store multiple ids for a single grant.', async(): Promise<void> => {
    payload.grantId = grantId;
    const id2 = 'id2!';
    const payload2 = { data: 'data2!', grantId };
    await expect(adapter.upsert(id, payload, 333)).resolves.toBeUndefined();
    await expect(adapter.upsert(id2, payload2, 333)).resolves.toBeUndefined();
    await expect(adapter.find(id)).resolves.toBe(payload);
    await expect(adapter.find(id2)).resolves.toBe(payload2);
    await expect(adapter.revokeByGrantId(grantId)).resolves.toBeUndefined();
    await expect(adapter.find(id)).resolves.toBeUndefined();
    await expect(adapter.find(id2)).resolves.toBeUndefined();
  });

  it('can destroy the payload.', async(): Promise<void> => {
    await expect(adapter.upsert(id, payload, 333)).resolves.toBeUndefined();
    await expect(adapter.find(id)).resolves.toBe(payload);
    await expect(adapter.destroy(id)).resolves.toBeUndefined();
    await expect(adapter.find(id)).resolves.toBeUndefined();
  });

  it('can consume the payload.', async(): Promise<void> => {
    // Caching since the object gets modified
    const cachedPayload = { ...payload };
    await expect(adapter.upsert(id, payload, 333)).resolves.toBeUndefined();
    await expect(adapter.find(id)).resolves.toEqual(cachedPayload);
    await expect(adapter.consume(id)).resolves.toBeUndefined();
    await expect(adapter.find(id)).resolves.toEqual({ ...cachedPayload, consumed: Math.floor(Date.now() / 1000) });
  });

  it('does not do anything if consume finds no payload.', async(): Promise<void> => {
    await expect(adapter.consume(id)).resolves.toBeUndefined();
    await expect(adapter.find(id)).resolves.toBeUndefined();
  });
});
