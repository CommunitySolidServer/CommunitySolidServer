/**
 * Metadata related to pod generation.
 * Although the optional fields are not that relevant since this extends Dict,
 * they give an indication of what is sometimes expected.
 */
export interface PodSettings extends NodeJS.Dict<string> {
  /**
   * The name of the pod. Will be used for generating the identifier.
   */
  login: string;
  /**
   * The WebId of the owner of this pod.
   */
  webId: string;
  /**
   * Required for dynamic pod configuration.
   * Indicates the name of the config to use for the pod.
   */
  template?: string;
  /**
   * Name of the owner. Used in provisioning templates.
   */
  name?: string;
  /**
   * E-mail of the owner. Used in provisioning templates.
   */
  email?: string;
  /**
   * The OIDC issuer of the owner's WebId.
   */
  oidcIssuer?: string;
  /**
   * A registration token for linking the owner's WebId to an IDP.
   */
  oidcIssuerRegistrationToken?: string;
}
