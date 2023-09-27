import type { PodSettings } from '../../../../pods/settings/PodSettings';

/**
 * Can be used to create new pods and find relevant information.
 * Also keeps track of the owners of a pod.
 * The `visible` parameter indicates if an owner should be publicly exposed or not.
 */
export interface PodStore {
  /**
   * Creates a new pod and updates the account accordingly.
   *
   * @param accountId - Identifier of the account that is creating the account.
   * @param settings - Settings to create a pod with.
   * @param overwrite - If the pod is allowed to overwrite existing data.
   *
   * @returns The ID of the new pod resource.
   */
  create: (accountId: string, settings: PodSettings, overwrite: boolean) => Promise<string>;

  /**
   * Returns the baseURl and account that created the pod for the given pod ID.
   *
   * @param id - ID of the pod.
   */
  get: (id: string) => Promise<{ baseUrl: string; accountId: string } | undefined>;

  /**
   * Find the ID of the account that created the given pod.
   *
   * @param baseUrl - The pod base URL.
   */
  findByBaseUrl: (baseUrl: string) => Promise<{ id: string; accountId: string } | undefined>;

  /**
   * Find all the pod resources created by the given account ID.
   *
   * @param accountId - Account ID to find pod resources for.
   */
  findPods: (accountId: string) => Promise<{ id: string; baseUrl: string }[]>;

  /**
   * Find all owners for the given pod ID.
   *
   * @param id - ID of the pod.
   */
  getOwners: (id: string) => Promise<{ webId: string; visible: boolean }[] | undefined>;

  /**
   * Add or update an owner of a pod.
   * In case there already is an owner with this WebID, it will be updated,
   * otherwise a new owner will be added.
   *
   * @param id - ID of the pod.
   * @param webId - WebID of the owner.
   * @param visible - Whether the owner wants to be exposed or not.
   */
  updateOwner: (id: string, webId: string, visible: boolean) => Promise<void>;

  /**
   * Remove an owner from a pod.
   * This should not remove the last owner as a pod always needs to have at least one owner.
   * https://solidproject.org/TR/2022/protocol-20221231#server-storage-track-owner
   *
   * @param id - ID of the pod.
   * @param webId - WebID of the owner.
   */
  removeOwner: (id: string, webId: string) => Promise<void>;
}
