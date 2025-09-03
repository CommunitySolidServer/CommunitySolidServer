import { createPublicKey } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { exportJWK, generateKeyPair, importJWK } from 'jose';
import type { AsymmetricSigningAlgorithm, JWKS } from 'oidc-provider';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import type { AlgJwk, JwkGenerator } from './JwkGenerator';

/**
 * Generates a key pair once and then caches it using both an internal variable and a {@link KeyValueStorage}.
 * The storage makes sure the keys remain the same between server restarts,
 * while the internal variable makes it so the storage doesn't have to be accessed every time a key is needed.
 *
 * Only the private key is stored in the internal storage, using the `storageKey` parameter.
 * The public key is determined based on the private key and then also stored in memory.
 */
export class CachedJwkGenerator implements JwkGenerator {
  public readonly alg: AsymmetricSigningAlgorithm;

  private readonly key: string;
  private readonly storage: KeyValueStorage<string, JWKS>;

  private privateJwk?: AlgJwk;
  private publicJwk?: AlgJwk;

  public constructor(alg: AsymmetricSigningAlgorithm, storageKey: string, storage: KeyValueStorage<string, JWKS>) {
    this.alg = alg;
    this.key = storageKey;
    this.storage = storage;
  }

  public async getPrivateKey(): Promise<AlgJwk> {
    if (this.privateJwk) {
      return this.privateJwk;
    }

    // We store in JWKS format for backwards compatibility reasons.
    // If we want to just store the key instead we will need some way to do the migration.
    const jwks = await this.storage.get(this.key);
    if (jwks) {
      this.privateJwk = jwks.keys[0] as AlgJwk;
      return this.privateJwk;
    }

    const { privateKey } = await generateKeyPair(this.alg);

    // Make sure the JWK is a plain node object for storage
    const privateJwk = { ...await exportJWK(privateKey) } as AlgJwk;
    privateJwk.alg = this.alg;

    await this.storage.set(this.key, { keys: [ privateJwk ]});
    this.privateJwk = privateJwk;
    return privateJwk;
  }

  public async getPublicKey(): Promise<AlgJwk> {
    if (this.publicJwk) {
      return this.publicJwk;
    }

    const privateJwk = await this.getPrivateKey();

    // The main reason we generate the public key from the private key is, so we don't have to store it.
    // This allows our storage to not break previous versions where we only used the private key.
    // In practice this results in the same key.
    const privateKey = await importJWK(privateJwk);
    const publicKey = createPublicKey(privateKey as KeyObject);

    const publicJwk = { ...await exportJWK(publicKey) } as AlgJwk;
    // These fields get lost during the above proces
    publicJwk.alg = privateJwk.alg;

    this.publicJwk = publicJwk;

    return publicJwk;
  }
}
