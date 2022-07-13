import { generateKeyPair, exportJWK } from 'jose';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import type { JwksKeyGenerator } from './JwksKeyGenerator';

export class BasicJwksKeyGenerator implements JwksKeyGenerator {
  public constructor(
    private readonly storage: KeyValueStorage<string, { keys: any[] }>,
  ) { }

  public async getPrivateJwks(keyName: string): Promise<{ keys: any[] }> {
    const jwks = await this.storage.get(`${keyName}:private`);
    return jwks ?? (await this.generateAndSaveKeys(keyName)).private;
  }

  public async getPublicJwks(keyName: string): Promise<{ keys: any[] }> {
    const jwks = await this.storage.get(`${keyName}:public`);
    return jwks ?? (await this.generateAndSaveKeys(keyName)).public;
  }

  /**
   * Generate new keys and add them to the storage/cache.
   * @returns the newly generated keys
   */
  private async generateAndSaveKeys(keyName: string): Promise<{ public: { keys: any[] }; private: { keys: any[] }}> {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwkPrivate = await exportJWK(privateKey);
    const jwkPublic = await exportJWK(publicKey);
    // Required for Solid authn client
    jwkPrivate.alg = 'RS256';
    jwkPublic.alg = 'RS256';
    const newPrivateJwks = { keys: [ jwkPrivate ]};
    const newPublicJwks = { keys: [ jwkPublic ]};
    await this.storage.set(`${keyName}:private`, newPrivateJwks);
    await this.storage.set(`${keyName}:public`, newPublicJwks);
    return { public: newPublicJwks, private: newPrivateJwks };
  }
}
