import type { PodSettings } from '../../../../pods/settings/PodSettings';
import type { Account } from '../../account/util/Account';

/**
 * Can be used to create new pods.
 */
export interface PodStore {
  /**
   * Creates a new pod and updates the account accordingly.
   *
   * @param account - Account to create a pod for. Object will be updated in place.
   * @param settings - Settings to create a pod with.
   * @param overwrite - If the pod is allowed to overwrite existing data.
   *
   * @returns The resource corresponding to the created pod for this account.
   */
  create: (account: Account, settings: PodSettings, overwrite: boolean) => Promise<string>;
}
