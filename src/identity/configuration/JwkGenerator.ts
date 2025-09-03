import type { JWK } from 'jose';
import type { AsymmetricSigningAlgorithm } from 'oidc-provider';

/**
 * A {@link JWK} where the `alg` parameter is always defined.
 */
export interface AlgJwk extends JWK {
  alg: AsymmetricSigningAlgorithm;
}

/**
 * Generates an asymmetric JWK.
 *
 * The functions always need to return the same value.
 */
export interface JwkGenerator {
  /**
   * The algorithm used for the keys.
   */
  readonly alg: AsymmetricSigningAlgorithm;

  /**
   * @returns The public key of the asymmetric JWK.
   */
  getPublicKey: () => Promise<AlgJwk>;

  /**
   * @returns The private key of the asymmetric JWK.
   */
  getPrivateKey: () => Promise<AlgJwk>;
}
