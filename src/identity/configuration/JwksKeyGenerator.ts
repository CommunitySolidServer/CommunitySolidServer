/**
 * Generates a JWKS using a single RS256 JWK.
 * The JWKS will be cached so subsequent calls return the same key.
 */
export interface JwksKeyGenerator {
  getPrivateJwks: (keyName: string) => Promise<{ keys: any[] }>;
  getPublicJwks: (keyName: string) => Promise<{ keys: any[] }>;
}
