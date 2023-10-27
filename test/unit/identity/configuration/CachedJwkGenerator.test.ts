import { generateKeyPair, importJWK, jwtVerify, SignJWT } from 'jose';
import * as jose from 'jose';
import { CachedJwkGenerator } from '../../../../src/identity/configuration/CachedJwkGenerator';
import type { AlgJwk } from '../../../../src/identity/configuration/JwkGenerator';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import type { JWKS } from '../../../../templates/types/oidc-provider';

describe('A CachedJwkGenerator', (): void => {
  const alg = 'ES256';
  const storageKey = 'jwks';
  let storageMap: Map<string, AlgJwk>;
  let storage: jest.Mocked<KeyValueStorage<string, JWKS>>;
  let generator: CachedJwkGenerator;

  beforeEach(async(): Promise<void> => {
    storageMap = new Map();
    storage = {
      get: jest.fn(async(key: string): Promise<AlgJwk | undefined> => storageMap.get(key)),
      set: jest.fn(async(key: string, value: AlgJwk): Promise<any> => storageMap.set(key, value)),
    } as any;

    generator = new CachedJwkGenerator(alg, storageKey, storage);
  });

  it('generates a matching key set.', async(): Promise<void> => {
    const privateKey = await generator.getPrivateKey();
    expect(privateKey.alg).toBe(alg);

    const publicKey = await generator.getPublicKey();
    expect(publicKey.alg).toBe(alg);

    const privateObject = await importJWK(privateKey);
    const publicObject = await importJWK(publicKey);

    const signed = await new SignJWT({ data: 'signed data' }).setProtectedHeader({ alg }).sign(privateObject);
    await expect(jwtVerify(signed, publicObject)).resolves.toMatchObject({
      payload: {
        data: 'signed data',
      },
    });

    const otherKey = (await generateKeyPair(alg)).publicKey;
    await expect(jwtVerify(signed, otherKey)).rejects.toThrow('signature verification failed');
  });

  it('caches the private key in memory.', async(): Promise<void> => {
    const spy = jest.spyOn(jose, 'generateKeyPair');
    const privateKey = await generator.getPrivateKey();
    // 1 call from checking the storage
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledTimes(1);

    const privateKey2 = await generator.getPrivateKey();
    expect(privateKey).toBe(privateKey2);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('caches the public key in memory.', async(): Promise<void> => {
    const spy = jest.spyOn(jose, 'generateKeyPair');
    const publicKey = await generator.getPublicKey();
    // 1 call from checking the storage
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledTimes(1);

    const publicKey2 = await generator.getPublicKey();
    expect(publicKey).toBe(publicKey2);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('caches the key in storage in case of server restart.', async(): Promise<void> => {
    const spy = jest.spyOn(jose, 'generateKeyPair');
    const privateKey = await generator.getPrivateKey();
    // 1 call from checking the storage
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledTimes(1);

    const generator2 = new CachedJwkGenerator(alg, storageKey, storage);

    const privateKey2 = await generator2.getPrivateKey();
    expect(privateKey).toBe(privateKey2);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
