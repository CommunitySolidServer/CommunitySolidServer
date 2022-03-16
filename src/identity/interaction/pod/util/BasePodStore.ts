import { createHash } from 'crypto';
import type { PodManager } from '../../../../pods/PodManager';
import type { PodSettings } from '../../../../pods/settings/PodSettings';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import type { Account } from '../../account/util/Account';
import type { AccountStore } from '../../account/util/AccountStore';
import { safeUpdate } from '../../account/util/AccountUtil';
import type { PodIdRoute } from '../PodIdRoute';
import type { PodStore } from './PodStore';

/**
 * A {@link PodStore} implementation using a {@link PodManager} to create pods.
 */
export class BasePodStore implements PodStore {
  private readonly accountStore: AccountStore;
  private readonly podRoute: PodIdRoute;
  private readonly manager: PodManager;

  public constructor(accountStore: AccountStore, podRoute: PodIdRoute, manager: PodManager) {
    this.accountStore = accountStore;
    this.podRoute = podRoute;
    this.manager = manager;
  }

  public async create(account: Account, settings: PodSettings, overwrite: boolean): Promise<string> {
    const base = settings.base.path;
    // The unique identifier of the pod-account link
    const podId = createHash('sha256').update(base).digest('hex');
    const resource = this.podRoute.getPath({ accountId: account.id, podId });
    account.pods[base] = resource;

    try {
      await safeUpdate(account,
        this.accountStore,
        (): Promise<void> => this.manager.createPod(settings, overwrite));
    } catch (error: unknown) {
      throw new BadRequestHttpError(`Pod creation failed: ${createErrorMessage(error)}`);
    }

    return resource;
  }
}
