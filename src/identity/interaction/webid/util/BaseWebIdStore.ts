import { Initializer } from '../../../../init/Initializer';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import { ACCOUNT_TYPE } from '../../account/util/LoginStorage';
import type { AccountLoginStorage } from '../../account/util/LoginStorage';
import type { WebIdStore } from './WebIdStore';

const STORAGE_TYPE = 'webIdLink';
const STORAGE_DESCRIPTION = {
  webId: 'string',
  accountId: `id:${ACCOUNT_TYPE}`,
} as const;

/**
 * A {@link WebIdStore} using a {@link AccountLoginStorage} to store the links.
 * Needs to be initialized before it can be used.
 */
export class BaseWebIdStore extends Initializer implements WebIdStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: AccountLoginStorage<{ [STORAGE_TYPE]: typeof STORAGE_DESCRIPTION }>;
  private initialized = false;

  public constructor(storage: AccountLoginStorage<any>) {
    super();
    this.storage = storage;
  }

  // Initialize the type definitions
  public async handle(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.storage.defineType(STORAGE_TYPE, STORAGE_DESCRIPTION, false);
      await this.storage.createIndex(STORAGE_TYPE, 'accountId');
      await this.storage.createIndex(STORAGE_TYPE, 'webId');
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(`Error defining WebID links in storage: ${createErrorMessage(cause)}`,
        { cause });
    }
  }

  public async get(id: string): Promise<{ accountId: string; webId: string } | undefined> {
    return this.storage.get(STORAGE_TYPE, id);
  }

  public async isLinked(webId: string, accountId: string): Promise<boolean> {
    const result = await this.storage.find(STORAGE_TYPE, { webId, accountId });
    return result.length > 0;
  }

  public async findLinks(accountId: string): Promise<{ id: string; webId: string }[]> {
    return (await this.storage.find(STORAGE_TYPE, { accountId }))
      .map(({ id, webId }): { id: string; webId: string } => ({ id, webId }));
  }

  public async create(webId: string, accountId: string): Promise<string> {
    if (await this.isLinked(webId, accountId)) {
      this.logger.warn(`Trying to link WebID ${webId} which is already linked to this account ${accountId}`);
      throw new BadRequestHttpError(`${webId} is already registered to this account.`);
    }

    const result = await this.storage.create(STORAGE_TYPE, { webId, accountId });

    this.logger.debug(`Linked WebID ${webId} to account ${accountId}`);

    return result.id;
  }

  public async delete(linkId: string): Promise<void> {
    this.logger.debug(`Deleting WebID link with ID ${linkId}`);
    return this.storage.delete(STORAGE_TYPE, linkId);
  }
}
