import { randomBytes } from 'node:crypto';
import { Initializer } from '../../../../init/Initializer';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import { ACCOUNT_TYPE } from '../../account/util/LoginStorage';
import type { AccountLoginStorage } from '../../account/util/LoginStorage';
import type { ClientCredentials, ClientCredentialsStore } from './ClientCredentialsStore';

export const CLIENT_CREDENTIALS_STORAGE_TYPE = 'clientCredentials';
export const CLIENT_CREDENTIALS_STORAGE_DESCRIPTION = {
  label: 'string',
  accountId: `id:${ACCOUNT_TYPE}`,
  secret: 'string',
  webId: 'string',
} as const;

/**
 * A {@link ClientCredentialsStore} that uses a {@link AccountLoginStorage} for storing the tokens.
 * Needs to be initialized before it can be used.
 */
export class BaseClientCredentialsStore extends Initializer implements ClientCredentialsStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: AccountLoginStorage<{ [CLIENT_CREDENTIALS_STORAGE_TYPE]:
      typeof CLIENT_CREDENTIALS_STORAGE_DESCRIPTION; }>;

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
      await this.storage.defineType(CLIENT_CREDENTIALS_STORAGE_TYPE, CLIENT_CREDENTIALS_STORAGE_DESCRIPTION, false);
      await this.storage.createIndex(CLIENT_CREDENTIALS_STORAGE_TYPE, 'accountId');
      await this.storage.createIndex(CLIENT_CREDENTIALS_STORAGE_TYPE, 'label');
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(
        `Error defining client credentials in storage: ${createErrorMessage(cause)}`,
        { cause },
      );
    }
  }

  public async get(id: string): Promise<ClientCredentials | undefined> {
    return this.storage.get(CLIENT_CREDENTIALS_STORAGE_TYPE, id);
  }

  public async findByLabel(label: string): Promise<ClientCredentials | undefined> {
    const result = await this.storage.find(CLIENT_CREDENTIALS_STORAGE_TYPE, { label });
    if (result.length === 0) {
      return;
    }
    return result[0];
  }

  public async findByAccount(accountId: string): Promise<ClientCredentials[]> {
    return this.storage.find(CLIENT_CREDENTIALS_STORAGE_TYPE, { accountId });
  }

  public async create(label: string, webId: string, accountId: string): Promise<ClientCredentials> {
    const secret = randomBytes(64).toString('hex');

    this.logger.debug(
      `Creating client credentials token with label ${label} for WebID ${webId} and account ${accountId}`,
    );

    return this.storage.create(CLIENT_CREDENTIALS_STORAGE_TYPE, { accountId, label, webId, secret });
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting client credentials token with ID ${id}`);
    return this.storage.delete(CLIENT_CREDENTIALS_STORAGE_TYPE, id);
  }
}
