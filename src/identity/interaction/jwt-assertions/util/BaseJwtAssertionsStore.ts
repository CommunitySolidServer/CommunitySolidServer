import { randomBytes } from 'node:crypto';
import { Initializer } from '../../../../init/Initializer';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import { ACCOUNT_TYPE } from '../../account/util/LoginStorage';
import type { AccountLoginStorage } from '../../account/util/LoginStorage';
import type { JwtAssertion, JwtAssertionsStore } from './JwtAssertionsStore';

export const JWT_ASSERTIONS_STORAGE_TYPE = 'jwtAssertions';
export const JWT_ASSERTIONS_STORAGE_DESCRIPTION = {
  client: 'string',
  agent: 'string',
  accountId: `id:${ACCOUNT_TYPE}`,
} as const;

/**
 * A {@link JwtAssertionsStore} that uses a {@link AccountLoginStorage} for storing the tokens.
 * Needs to be initialized before it can be used.
 */
export class BaseJwtAssertionsStore extends Initializer implements JwtAssertionsStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: AccountLoginStorage<{ [JWT_ASSERTIONS_STORAGE_TYPE]:
      typeof JWT_ASSERTIONS_STORAGE_DESCRIPTION; }>;

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
      await this.storage.defineType(JWT_ASSERTIONS_STORAGE_TYPE, JWT_ASSERTIONS_STORAGE_DESCRIPTION, false);
      await this.storage.createIndex(JWT_ASSERTIONS_STORAGE_TYPE, 'client');
      await this.storage.createIndex(JWT_ASSERTIONS_STORAGE_TYPE, 'agent');
      await this.storage.createIndex(JWT_ASSERTIONS_STORAGE_TYPE, 'accountId');
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(
        `Error defining client credentials in storage: ${createErrorMessage(cause)}`,
        { cause },
      );
    }
  }

  public async get(id: string): Promise<JwtAssertion | undefined> {
    return this.storage.get(JWT_ASSERTIONS_STORAGE_TYPE, id);
  }

  public async findByLabel(label: string): Promise<JwtAssertion | undefined> {
    const result = await this.storage.find(JWT_ASSERTIONS_STORAGE_TYPE, { client: label });
    if (result.length === 0) {
      return;
    }
    return result[0];
  }

  public async findByAccount(accountId: string): Promise<JwtAssertion[]> {
    return this.storage.find(JWT_ASSERTIONS_STORAGE_TYPE, { accountId });
  }

  public async create(label: string, webId: string, accountId: string): Promise<JwtAssertion> {
    const secret = randomBytes(64).toString('hex');

    this.logger.debug(
      `Creating client credentials token with label ${label} for WebID ${webId} and account ${accountId}`,
    );

    return this.storage.create(JWT_ASSERTIONS_STORAGE_TYPE, { accountId, client: label, agent: webId });
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting client credentials token with ID ${id}`);
    return this.storage.delete(JWT_ASSERTIONS_STORAGE_TYPE, id);
  }
}
