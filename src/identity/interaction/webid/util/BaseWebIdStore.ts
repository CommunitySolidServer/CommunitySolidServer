import { Initializer } from '../../../../init/Initializer';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import { ACCOUNT_TYPE } from '../../account/util/LoginStorage';
import type { AccountLoginStorage } from '../../account/util/LoginStorage';
import type { WebIdStore } from './WebIdStore';

export const WEBID_STORAGE_TYPE = 'webIdLink';
export const WEBID_STORAGE_DESCRIPTION = {
  webId: 'string',
  accountId: `id:${ACCOUNT_TYPE}`,
} as const;

/**
 * A {@link WebIdStore} using a {@link AccountLoginStorage} to store the links.
 * Needs to be initialized before it can be used.
 */
export class BaseWebIdStore extends Initializer implements WebIdStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: AccountLoginStorage<{ [WEBID_STORAGE_TYPE]: typeof WEBID_STORAGE_DESCRIPTION }>;
  private initialized = false;

  // Wrong typings to prevent Components.js typing issues
  public constructor(storage: AccountLoginStorage<Record<string, never>>) {
    super();
    this.storage = storage as unknown as typeof this.storage;
  }

  // Initialize the type definitions
  public async handle(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.storage.defineType(WEBID_STORAGE_TYPE, WEBID_STORAGE_DESCRIPTION, false);
      await this.storage.createIndex(WEBID_STORAGE_TYPE, 'accountId');
      await this.storage.createIndex(WEBID_STORAGE_TYPE, 'webId');
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(
        `Error defining WebID links in storage: ${createErrorMessage(cause)}`,
        { cause },
      );
    }
  }

  public async get(id: string): Promise<{ accountId: string; webId: string } | undefined> {
    return this.storage.get(WEBID_STORAGE_TYPE, id);
  }

  public async isLinked(webId: string, accountId: string): Promise<boolean> {
    const result = await this.storage.find(WEBID_STORAGE_TYPE, { webId, accountId });
    return result.length > 0;
  }

  public async findLinks(accountId: string): Promise<{ id: string; webId: string }[]> {
    return (await this.storage.find(WEBID_STORAGE_TYPE, { accountId }))
      .map(({ id, webId }): { id: string; webId: string } => ({ id, webId }));
  }

  public async create(webId: string, accountId: string): Promise<string> {
    if (await this.isLinked(webId, accountId)) {
      this.logger.warn(`Trying to link WebID ${webId} which is already linked to this account ${accountId}`);
      throw new BadRequestHttpError(`${webId} is already registered to this account.`);
    }

    const result = await this.storage.create(WEBID_STORAGE_TYPE, { webId, accountId });

    this.logger.debug(`Linked WebID ${webId} to account ${accountId}`);

    return result.id;
  }

  public async delete(linkId: string): Promise<void> {
    this.logger.debug(`Deleting WebID link with ID ${linkId}`);
    return this.storage.delete(WEBID_STORAGE_TYPE, linkId);
  }
}
