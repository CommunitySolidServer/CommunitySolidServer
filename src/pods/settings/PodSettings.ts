import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';

/**
 * Metadata related to pod generation.
 */
export interface PodSettings extends NodeJS.Dict<unknown> {
  /**
   * The root of the pod. Determines where the pod will be created.
   */
  base: ResourceIdentifier;
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
   * The OIDC issuer of the owner's WebId. Necessary if the WebID in the pod is registered with the IDP.
   */
  oidcIssuer?: string;
}
