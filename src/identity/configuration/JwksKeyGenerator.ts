import type { JWK } from 'jose';

/**
 * Generates a JWKS using a single RS256 JWK.
 * The JWKS will be cached so subsequent calls return the same key.
 */
export interface JwksKeyGenerator {
  getPrivateJwks: (keyName: string, alg?: string) => Promise<{ keys: JWK[] }>;
  getPublicJwks: (keyName: string, alg?: string) => Promise<{ keys: JWK[] }>;
}
