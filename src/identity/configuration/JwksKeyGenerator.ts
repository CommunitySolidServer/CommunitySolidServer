export interface JwksKeyGenerator {
  /**
   * Generates a JWKS using a single RS256 JWK..
   * The JWKS will be cached so subsequent calls return the same key.
   */
  getPrivateJwks: (keyName: string) => Promise<{ keys: any[] }>;
  getPublicJwks: (keyName: string) => Promise<{ keys: any[] }>;
}
