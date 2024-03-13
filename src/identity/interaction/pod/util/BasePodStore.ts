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

export const POD_STORAGE_TYPE = 'pod';
export const POD_STORAGE_DESCRIPTION = {
  baseUrl: 'string',
  accountId: `id:${ACCOUNT_TYPE}`,
} as const;

export const OWNER_STORAGE_TYPE = 'owner';
export const OWNER_STORAGE_DESCRIPTION = {
  webId: 'string',
  visible: 'boolean',
  podId: `id:${POD_STORAGE_TYPE}`,
} as const;

/**
 * A {@link PodStore} implementation using a {@link PodManager} to create pods
 * and a {@link AccountLoginStorage} to store the data.
 * Needs to be initialized before it can be used.
 *
 * Adds the initial WebID as the owner of the pod.
 * By default, this owner is not exposed through a link header.
 * This can be changed by setting the constructor `visible` parameter to `true`.
 */
export class BasePodStore extends Initializer implements PodStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: AccountLoginStorage<{
    [POD_STORAGE_TYPE]: typeof POD_STORAGE_DESCRIPTION;
    [OWNER_STORAGE_TYPE]: typeof OWNER_STORAGE_DESCRIPTION;
  }>;

  private readonly manager: PodManager;
  private readonly visible: boolean;

  private initialized = false;

  // Wrong typings to prevent Components.js typing issues
  public constructor(storage: AccountLoginStorage<Record<string, never>>, manager: PodManager, visible = false) {
    super();
    this.storage = storage as unknown as typeof this.storage;
    this.visible = visible;
    this.manager = manager;
  }

  // Initialize the type definitions
  public async handle(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.storage.defineType(POD_STORAGE_TYPE, POD_STORAGE_DESCRIPTION, false);
      await this.storage.createIndex(POD_STORAGE_TYPE, 'accountId');
      await this.storage.createIndex(POD_STORAGE_TYPE, 'baseUrl');
      await this.storage.defineType(OWNER_STORAGE_TYPE, OWNER_STORAGE_DESCRIPTION, false);
      await this.storage.createIndex(OWNER_STORAGE_TYPE, 'podId');
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(`Error defining pods in storage: ${createErrorMessage(cause)}`, { cause });
    }
  }

  public async create(accountId: string, settings: PodSettings, overwrite: boolean): Promise<string> {
    // Adding pod to storage first as we cannot undo creating the pod below.
    // This call might also fail because there is no login method yet on the account.
    const pod = await this.storage.create(POD_STORAGE_TYPE, { baseUrl: settings.base.path, accountId });
    await this.storage.create(OWNER_STORAGE_TYPE, { podId: pod.id, webId: settings.webId, visible: this.visible });

    try {
      await this.manager.createPod(settings, overwrite);
    } catch (error: unknown) {
      this.logger.warn(`Pod creation failed for account ${accountId}: ${createErrorMessage(error)}`);
      await this.storage.delete(POD_STORAGE_TYPE, pod.id);
      throw new BadRequestHttpError(`Pod creation failed: ${createErrorMessage(error)}`, { cause: error });
    }
    this.logger.debug(`Created pod ${settings.name} for account ${accountId}`);

    return pod.id;
  }

  public async get(id: string): Promise<{ baseUrl: string; accountId: string } | undefined> {
    const pod = await this.storage.get(POD_STORAGE_TYPE, id);
    if (!pod) {
      return;
    }
    return { baseUrl: pod.baseUrl, accountId: pod.accountId };
  }

  public async findByBaseUrl(baseUrl: string): Promise<{ id: string; accountId: string } | undefined> {
    const result = await this.storage.find(POD_STORAGE_TYPE, { baseUrl });
    if (result.length === 0) {
      return;
    }
    return { id: result[0].id, accountId: result[0].accountId };
  }

  public async findPods(accountId: string): Promise<{ id: string; baseUrl: string }[]> {
    return (await this.storage.find(POD_STORAGE_TYPE, { accountId }))
      .map(({ id, baseUrl }): { id: string; baseUrl: string } => ({ id, baseUrl }));
  }

  public async getOwners(id: string): Promise<{ webId: string; visible: boolean }[] | undefined> {
    const results = await this.storage.find(OWNER_STORAGE_TYPE, { podId: id });
    if (results.length === 0) {
      return;
    }
    return results.map((result): { webId: string; visible: boolean } =>
      ({ webId: result.webId, visible: result.visible }));
  }

  public async updateOwner(id: string, webId: string, visible: boolean): Promise<void> {
    // Need to first check if there already is an owner with the given WebID
    // so we know if we need to create or update.
    const matches = await this.storage.find(OWNER_STORAGE_TYPE, { webId, podId: id });
    if (matches.length === 0) {
      await this.storage.create(OWNER_STORAGE_TYPE, { webId, visible, podId: id });
    } else {
      await this.storage.setField(OWNER_STORAGE_TYPE, matches[0].id, 'visible', visible);
    }
  }

  public async removeOwner(id: string, webId: string): Promise<void> {
    const owners = await this.storage.find(OWNER_STORAGE_TYPE, { podId: id });
    const match = owners.find((owner): boolean => owner.webId === webId);
    if (!match) {
      return;
    }
    if (owners.length === 1) {
      throw new BadRequestHttpError('Unable to remove the last owner of a pod.');
    }
    await this.storage.delete(OWNER_STORAGE_TYPE, match.id);
  }
}
