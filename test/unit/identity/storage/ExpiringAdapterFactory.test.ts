import type { ExpiringAdapter } from '../../../../src/identity/storage/ExpiringAdapterFactory';
import { ExpiringAdapterFactory } from '../../../../src/identity/storage/ExpiringAdapterFactory';
import type { ExpiringStorage } from '../../../../src/storage/keyvalue/ExpiringStorage';
import type { AdapterPayload } from '../../../../templates/types/oidc-provider';

// Use fixed dates
jest.useFakeTimers();

describe('An ExpiringAdapterFactory', (): void => {
  const name = 'nnaammee';
  const id = 'http://alice.test.com/card#me';
  const grantId = 'grant123456';
  let payload: AdapterPayload;
  let storage: ExpiringStorage<string, unknown>;
  let adapter: ExpiringAdapter;
  let factory: ExpiringAdapterFactory;
  const expiresIn = 333 * 1000;

  beforeEach(async(): Promise<void> => {
    payload = { data: 'data!' };

    const map = new Map<string, any>();
    storage = {
      get: jest.fn().mockImplementation((key: string): any => map.get(key)),
      set: jest.fn().mockImplementation((key: string, value: any): any => map.set(key, value)),
      delete: jest.fn().mockImplementation((key: string): any => map.delete(key)),
    } as any;

    factory = new ExpiringAdapterFactory(storage);
    adapter = factory.createStorageAdapter(name);
  });

  it('can find payload by id.', async(): Promise<void> => {
    await expect(adapter.upsert(id, payload, 333)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), payload, expiresIn);
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
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), payload, expiresIn);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), id, expiresIn);
    await expect(adapter.findByUserCode(userCode)).resolves.toBe(payload);
  });

  it('can find payload by uid.', async(): Promise<void> => {
    const uid = 'uid!';
    payload.uid = uid;
    await expect(adapter.upsert(id, payload, 333)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), payload, expiresIn);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), id, expiresIn);
    await expect(adapter.findByUid(uid)).resolves.toBe(payload);
  });

  it('can revoke by grantId.', async(): Promise<void> => {
    payload.grantId = grantId;
    await expect(adapter.upsert(id, payload, 333)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), payload, expiresIn);
    expect(storage.set).toHaveBeenCalledWith(expect.anything(), [ expect.anything() ], expiresIn);
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
