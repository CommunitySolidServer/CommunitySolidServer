/* eslint-disable import/no-unresolved */
// import/no-unresolved can't handle jose imports
import { fromKeyLike } from 'jose/jwk/from_key_like';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import type { JwksKeyGenerator } from './JwksKeyGenerator';

export interface BasicJwksKeyGeneratorArgs {
  storage: KeyValueStorage<string, unknown>;
}

export class BasicJwksKeyGenerator implements JwksKeyGenerator {
  private readonly storage!: KeyValueStorage<string, unknown>;

  public constructor(args: BasicJwksKeyGeneratorArgs) {
    this.storage = args.storage;
  }

  /**
   * Generates a JWKS using a single RS256 JWK..
   * The JWKS will be cached so subsequent calls return the same key.
   */
  public async getPrivateJwks(keyName: string): Promise<{ keys: any[] }> {
    // Check to see if the keys are already saved
    const jwks = await this.storage.get(`${keyName}:private`) as { keys: any[] } | undefined;
    if (jwks) {
      return jwks;
    }
    return (await this.generateAndSaveKeys(keyName)).private;
  }

  public async getPublicJwks(keyName: string): Promise<{ keys: any[] }> {
    const jwks = await this.storage.get(`${keyName}:public`) as { keys: any[] } | undefined;
    if (jwks) {
      return jwks;
    }
    return (await this.generateAndSaveKeys(keyName)).public;
  }

  private async generateAndSaveKeys(keyName: string): Promise<{ public: { keys: any[] }; private: { keys: any[] }}> {
    // If they are not, generate and save them
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwkPrivate = await fromKeyLike(privateKey);
    const jwkPublic = await fromKeyLike(publicKey);
    // Required for Solid authn client
    jwkPrivate.alg = 'RS256';
    jwkPublic.alg = 'RS256';
    // In node v15.12.0 the JWKS does not get accepted because the JWK is not a plain object,
    // which is why we convert it into a plain object here.
    // Potentially this can be changed at a later point in time to `{ keys: [ jwk ]}`.
    const newPrivateJwks = { keys: [{ ...jwkPrivate }]};
    const newPublicJwks = { keys: [{ ...jwkPublic }]};
    await this.storage.set(`${keyName}:private`, newPrivateJwks);
    await this.storage.set(`${keyName}:public`, newPublicJwks);
    return { public: newPublicJwks, private: newPrivateJwks };
  }
}
