import { generateKeyPair, exportJWK } from 'jose';
import type { JWK } from 'jose';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import type { JwksKeyGenerator } from './JwksKeyGenerator';

export class BasicJwksKeyGenerator implements JwksKeyGenerator {
  public constructor(
    private readonly storage: KeyValueStorage<string, { keys: JWK[] }>,
  ) { }

  public async getPrivateJwks(keyName: string, alg = 'RS256'): Promise<{ keys: JWK[] }> {
    const jwks = await this.storage.get(`${keyName}:private`);
    return jwks ?? (await this.generateAndSaveKeys(keyName, alg)).private;
  }

  public async getPublicJwks(keyName: string, alg = 'RS256'): Promise<{ keys: JWK[] }> {
    const jwks = await this.storage.get(`${keyName}:public`);
    return jwks ?? (await this.generateAndSaveKeys(keyName, alg)).public;
  }

  /**
   * Generate new keys and add them to the storage/cache.
   * @returns the newly generated keys
   */
  private async generateAndSaveKeys(
    keyName: string,
    alg: string,
  ): Promise<{ public: { keys: JWK[] }; private: { keys: JWK[] }}> {
    const { privateKey, publicKey } = await generateKeyPair(alg);
    const jwkPrivate = await exportJWK(privateKey);
    const jwkPublic = await exportJWK(publicKey);
    // Required for Solid authn client
    jwkPrivate.alg = alg;
    jwkPublic.alg = alg;
    const newPrivateJwks = { keys: [ jwkPrivate ]};
    const newPublicJwks = { keys: [ jwkPublic ]};
    await this.storage.set(`${keyName}:private`, newPrivateJwks);
    await this.storage.set(`${keyName}:public`, newPublicJwks);
    return { public: newPublicJwks, private: newPrivateJwks };
  }
}
