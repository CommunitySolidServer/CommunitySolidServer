/* eslint-disable @typescript-eslint/no-unused-vars */
import { BasicJwksKeyGenerator } from '../../../../src/identity/configuration/BasicJwksKeyGenerator';
import type { JwksKeyGenerator } from '../../../../src/identity/configuration/JwksKeyGenerator';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { MemoryMapStorage } from '../../../../src/storage/keyvalue/MemoryMapStorage';

jest.mock('jose', (): any => ({
  generateKeyPair: jest.fn(async(alg: string): Promise<any> => Promise.resolve(
    { privateKey: 'PRIVATE', publicKey: 'PUBLIC' },
  )),
  exportJWK: jest.fn(async(key: any): Promise<any> => Promise.resolve({ key })),
}));

describe('A BasicJwksKeyGenerator', (): void => {
  let storage: KeyValueStorage<string, unknown>;
  let basicJwksKeyGenerator: JwksKeyGenerator;
  beforeEach(async(): Promise<void> => {
    storage = new MemoryMapStorage();
    basicJwksKeyGenerator = new BasicJwksKeyGenerator({ storage });
    jest.clearAllMocks();
    jest.spyOn(storage, 'set');
  });
  it('generates keys if not yet in storage and return expected private key.', async(): Promise<void> => {
    const promise = basicJwksKeyGenerator.getPrivateJwks('test');
    await expect(promise).resolves.toStrictEqual({ keys: [{ alg: 'RS256', key: 'PRIVATE' }]});
    await expect(storage.get(`test:private`)).resolves.toStrictEqual({ keys: [{ alg: 'RS256', key: 'PRIVATE' }]});
    await expect(storage.get(`test:public`)).resolves.toStrictEqual({ keys: [{ alg: 'RS256', key: 'PUBLIC' }]});
    expect(storage.set).toHaveBeenCalledTimes(2);
  });
  it('generates keys if not yet in storage and return expected public key.', async(): Promise<void> => {
    const promise = basicJwksKeyGenerator.getPublicJwks('test');
    await expect(promise).resolves.toStrictEqual({ keys: [{ alg: 'RS256', key: 'PUBLIC' }]});
    await expect(storage.get(`test:private`)).resolves.toStrictEqual({ keys: [{ alg: 'RS256', key: 'PRIVATE' }]});
    await expect(storage.get(`test:public`)).resolves.toStrictEqual({ keys: [{ alg: 'RS256', key: 'PUBLIC' }]});
    expect(storage.set).toHaveBeenCalledTimes(2);
  });
  it('get private key from storage if already generated.', async(): Promise<void> => {
    await storage.set(`test:private`, { keys: [{ alg: 'RS256', key: 'PRIVATE' }]});
    const promise = basicJwksKeyGenerator.getPrivateJwks('test');
    await expect(promise).resolves.toStrictEqual({ keys: [{ alg: 'RS256', key: 'PRIVATE' }]});
    expect(storage.set).toHaveBeenCalledTimes(1);
  });
  it('get public key from storage if already generated.', async(): Promise<void> => {
    await storage.set(`test:public`, { keys: [{ alg: 'RS256', key: 'PUBLIC' }]});
    const promise = basicJwksKeyGenerator.getPublicJwks('test');
    await expect(promise).resolves.toStrictEqual({ keys: [{ alg: 'RS256', key: 'PUBLIC' }]});
    expect(storage.set).toHaveBeenCalledTimes(1);
  });
});
