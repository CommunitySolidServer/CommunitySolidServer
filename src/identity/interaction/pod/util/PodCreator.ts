import { AsyncHandler } from 'asynchronous-handlers';

export interface PodCreatorInput {
  /**
   * The ID of the account to create the pod for.
   */
  accountId: string;
  /**
   * The name to use when generating the base URL of the pod.
   * If undefined, the pod will be created in the root of the server.
   */
  name?: string;
  /**
   * The WebID to use for creation of the pod.
   * This WebID will be used in the templates to, for example, determine who has access.
   * If none is provided, the WebID generated by the creator will be used,
   * in which case that WebID will also be linked to the account.
   */
  webId?: string;
  /**
   * Additional settings to use when generating a pod.
   */
  settings?: Record<string, unknown>;
}

export interface PodCreatorOutput {
  /**
   * The ID of the generated pod.
   */
  podId: string;
  /**
   * The URl of the generated pod.
   */
  podUrl: string;
  /**
   * The WebID that was used to generate the pod.
   */
  webId: string;
  /**
   * The ID of the WebID link if one was generated.
   */
  webIdLink?: string;
}

/**
 * Handles creating a pod and linking the created WebID.
 */
export abstract class PodCreator extends AsyncHandler<PodCreatorInput, PodCreatorOutput> {}
