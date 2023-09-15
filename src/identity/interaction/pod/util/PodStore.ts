import type { PodSettings } from '../../../../pods/settings/PodSettings';

/**
 * Can be used to create new pods and find relevant information.
 */
export interface PodStore {
  /**
   * Creates a new pod and updates the account accordingly.
   *
   * @param accountId - Identifier of the account that is creating the account..
   * @param settings - Settings to create a pod with.
   * @param overwrite - If the pod is allowed to overwrite existing data.
   *
   * @returns The ID of the new pod resource.
   */
  create: (accountId: string, settings: PodSettings, overwrite: boolean) => Promise<string>;

  /**
   * Find the ID of the account that created the given pod.
   *
   * @param baseUrl - The pod base URL.
   */
  findAccount: (baseUrl: string) => Promise<string | undefined>;

  /**
   * Find all the pod resources created by the given account ID.
   *
   * @param accountId - Account ID to find pod resources for.
   */
  findPods: (accountId: string) => Promise<{ id: string; baseUrl: string }[]>;
}
