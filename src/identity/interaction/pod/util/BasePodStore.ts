import { Initializer } from '../../../../init/Initializer';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { PodManager } from '../../../../pods/PodManager';
import type { PodSettings } from '../../../../pods/settings/PodSettings';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import { ACCOUNT_TYPE } from '../../account/util/LoginStorage';
import type { AccountLoginStorage } from '../../account/util/LoginStorage';
import type { PodStore } from './PodStore';

const STORAGE_TYPE = 'pod';
const STORAGE_DESCRIPTION = {
  baseUrl: 'string',
  accountId: `id:${ACCOUNT_TYPE}`,
} as const;

/**
 * A {@link PodStore} implementation using a {@link PodManager} to create pods
 * and a {@link AccountLoginStorage} to store the data.
 * Needs to be initialized before it can be used.
 */
export class BasePodStore extends Initializer implements PodStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: AccountLoginStorage<{ [STORAGE_TYPE]: typeof STORAGE_DESCRIPTION }>;
  private readonly manager: PodManager;
  private initialized = false;

  public constructor(storage: AccountLoginStorage<any>, manager: PodManager) {
    super();
    this.storage = storage;
    this.manager = manager;
  }

  // Initialize the type definitions
  public async handle(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.storage.defineType(STORAGE_TYPE, STORAGE_DESCRIPTION, false);
      await this.storage.createIndex(STORAGE_TYPE, 'accountId');
      await this.storage.createIndex(STORAGE_TYPE, 'baseUrl');
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(`Error defining pods in storage: ${createErrorMessage(cause)}`,
        { cause });
    }
  }

  public async create(accountId: string, settings: PodSettings, overwrite: boolean): Promise<string> {
    // Adding pod to storage first as we cannot undo creating the pod below.
    // This call might also fail because there is no login method yet on the account.
    const pod = await this.storage.create(STORAGE_TYPE, { baseUrl: settings.base.path, accountId });

    try {
      await this.manager.createPod(settings, overwrite);
    } catch (error: unknown) {
      this.logger.warn(`Pod creation failed for account ${accountId}: ${createErrorMessage(error)}`);
      await this.storage.delete(STORAGE_TYPE, pod.id);
      throw new BadRequestHttpError(`Pod creation failed: ${createErrorMessage(error)}`, { cause: error });
    }
    this.logger.debug(`Created pod ${settings.name} for account ${accountId}`);

    return pod.id;
  }

  public async findAccount(baseUrl: string): Promise<string | undefined> {
    const result = await this.storage.find(STORAGE_TYPE, { baseUrl });
    if (result.length === 0) {
      return;
    }
    return result[0].accountId;
  }

  public async findPods(accountId: string): Promise<{ id: string; baseUrl: string }[]> {
    return (await this.storage.find(STORAGE_TYPE, { accountId }))
      .map(({ id, baseUrl }): { id: string; baseUrl: string } => ({ id, baseUrl }));
  }
}
