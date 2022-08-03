import type { JWK } from 'jose';
import { BasicJwksKeyGenerator } from '../../../../src/identity/configuration/BasicJwksKeyGenerator';
import type { JwksKeyGenerator } from '../../../../src/identity/configuration/JwksKeyGenerator';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { MemoryMapStorage } from '../../../../src/storage/keyvalue/MemoryMapStorage';

jest.mock('jose', (): any => ({
  generateKeyPair: jest.fn(async(): Promise<any> => ({ privateKey: 'PRIVATE', publicKey: 'PUBLIC' })),
  exportJWK: jest.fn(async(key: any): Promise<JWK> => ({ key })),
}));

describe('A BasicJwksKeyGenerator', (): void => {
  let storage: KeyValueStorage<string, { keys: JWK[] }>;
  let basicJwksKeyGenerator: JwksKeyGenerator;

  beforeEach((): void => {
    storage = new MemoryMapStorage();
    basicJwksKeyGenerator = new BasicJwksKeyGenerator(storage);
  });

  describe('getPrivateJwks()', (): void => {
    it('should generate and cache the keys when they are not already cached.', async(): Promise<void> => {
      await expect(storage.get(`test:private`)).resolves.toBeUndefined();
      await expect(storage.get(`test:public`)).resolves.toBeUndefined();
      await basicJwksKeyGenerator.getPrivateJwks('test');
      await expect(storage.get(`test:private`)).resolves.toMatchObject({ keys: [{ alg: 'RS256', key: 'PRIVATE' }]});
      await expect(storage.get(`test:public`)).resolves.toMatchObject({ keys: [{ alg: 'RS256', key: 'PUBLIC' }]});
    });

    it('should return the correct private key.', async(): Promise<void> => {
      await storage.set('test:private', { keys: [
        { alg: 'RS256', key: 'PRIVATE' } as unknown as JWK,
      ]});
      const result = basicJwksKeyGenerator.getPrivateJwks('test');
      await expect(result).resolves.toMatchObject({ keys: [{ alg: 'RS256', key: 'PRIVATE' }]});
    });

    it('should use the alg provided by the user.', async(): Promise<void> => {
      const result = basicJwksKeyGenerator.getPrivateJwks('test', 'MOCK-ALG');
      await expect(result).resolves.toMatchObject({ keys: [{ alg: 'MOCK-ALG', key: 'PRIVATE' }]});
    });
  });

  describe('getPublicJwks()', (): void => {
    // Somewhat of a duplicate test but needed to cover all branches.
    it('should generate and cache the keys when they are not already cached.', async(): Promise<void> => {
      await expect(storage.get(`test:private`)).resolves.toBeUndefined();
      await expect(storage.get(`test:public`)).resolves.toBeUndefined();
      await basicJwksKeyGenerator.getPublicJwks('test');
      await expect(storage.get(`test:private`)).resolves.toMatchObject({ keys: [{ alg: 'RS256', key: 'PRIVATE' }]});
      await expect(storage.get(`test:public`)).resolves.toMatchObject({ keys: [{ alg: 'RS256', key: 'PUBLIC' }]});
    });

    it('should return the correct public key.', async(): Promise<void> => {
      await storage.set('test:public', { keys: [
        { alg: 'RS256', key: 'PUBLIC' } as unknown as JWK,
      ]});
      const result = basicJwksKeyGenerator.getPublicJwks('test');
      await expect(result).resolves.toMatchObject({ keys: [{ alg: 'RS256', key: 'PUBLIC' }]});
    });
  });
});
