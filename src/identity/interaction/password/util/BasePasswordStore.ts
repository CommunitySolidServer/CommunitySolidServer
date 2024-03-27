import { compare, hash } from 'bcryptjs';
import { Initializer } from '../../../../init/Initializer';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import { ForbiddenHttpError } from '../../../../util/errors/ForbiddenHttpError';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import { ACCOUNT_TYPE } from '../../account/util/LoginStorage';
import type { AccountLoginStorage } from '../../account/util/LoginStorage';
import type { PasswordStore } from './PasswordStore';

export const PASSWORD_STORAGE_TYPE = 'password';
export const PASSWORD_STORAGE_DESCRIPTION = {
  email: 'string',
  password: 'string',
  verified: 'boolean',
  accountId: `id:${ACCOUNT_TYPE}`,
} as const;

/**
 * A {@link PasswordStore} that uses a {@link KeyValueStorage} to store the entries.
 * Passwords are hashed and salted.
 * Default `saltRounds` is 10.
 */
export class BasePasswordStore extends Initializer implements PasswordStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: AccountLoginStorage<{ [PASSWORD_STORAGE_TYPE]: typeof PASSWORD_STORAGE_DESCRIPTION }>;
  private readonly saltRounds: number;
  private initialized = false;

  // Wrong typings to prevent Components.js typing issues
  public constructor(storage: AccountLoginStorage<Record<string, never>>, saltRounds = 10) {
    super();
    this.storage = storage as unknown as typeof this.storage;
    this.saltRounds = saltRounds;
  }

  // Initialize the type definitions
  public async handle(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.storage.defineType(PASSWORD_STORAGE_TYPE, PASSWORD_STORAGE_DESCRIPTION, true);
      await this.storage.createIndex(PASSWORD_STORAGE_TYPE, 'accountId');
      await this.storage.createIndex(PASSWORD_STORAGE_TYPE, 'email');
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(
        `Error defining email/password in storage: ${createErrorMessage(cause)}`,
        { cause },
      );
    }
  }

  public async create(email: string, accountId: string, password: string): Promise<string> {
    if (await this.findByEmail(email)) {
      this.logger.warn(`Trying to create duplicate login for email ${email}`);
      throw new BadRequestHttpError('There already is a login for this e-mail address.');
    }
    const payload = await this.storage.create(PASSWORD_STORAGE_TYPE, {
      accountId,
      email: email.toLowerCase(),
      password: await hash(password, this.saltRounds),
      verified: false,
    });
    return payload.id;
  }

  public async get(id: string): Promise<{ email: string; accountId: string } | undefined> {
    const result = await this.storage.get(PASSWORD_STORAGE_TYPE, id);
    if (!result) {
      return;
    }
    return { email: result.email, accountId: result.accountId };
  }

  public async findByEmail(email: string): Promise<{ accountId: string; id: string } | undefined> {
    const payload = await this.storage.find(PASSWORD_STORAGE_TYPE, { email: email.toLowerCase() });
    if (payload.length === 0) {
      return;
    }
    return { accountId: payload[0].accountId, id: payload[0].id };
  }

  public async findByAccount(accountId: string): Promise<{ id: string; email: string }[]> {
    return (await this.storage.find(PASSWORD_STORAGE_TYPE, { accountId }))
      .map(({ id, email }): { id: string; email: string } => ({ id, email }));
  }

  public async confirmVerification(id: string): Promise<void> {
    if (!await this.storage.has(PASSWORD_STORAGE_TYPE, id)) {
      this.logger.warn(`Trying to verify unknown password login ${id}`);
      throw new ForbiddenHttpError('Login does not exist.');
    }

    await this.storage.setField(PASSWORD_STORAGE_TYPE, id, 'verified', true);
  }

  public async authenticate(email: string, password: string): Promise<{ accountId: string; id: string }> {
    const payload = await this.storage.find(PASSWORD_STORAGE_TYPE, { email: email.toLowerCase() });
    if (payload.length === 0) {
      this.logger.warn(`Trying to get account info for unknown email ${email}`);
      throw new ForbiddenHttpError('Invalid email/password combination.');
    }
    if (!await compare(password, payload[0].password)) {
      this.logger.warn(`Incorrect password for email ${email}`);
      throw new ForbiddenHttpError('Invalid email/password combination.');
    }
    const { verified, accountId, id } = payload[0];
    if (!verified) {
      this.logger.warn(`Trying to get account info for unverified email ${email}`);
      throw new ForbiddenHttpError('Login still needs to be verified.');
    }
    return { accountId, id };
  }

  public async update(id: string, password: string): Promise<void> {
    if (!await this.storage.has(PASSWORD_STORAGE_TYPE, id)) {
      this.logger.warn(`Trying to update unknown password login ${id}`);
      throw new ForbiddenHttpError('Login does not exist.');
    }
    await this.storage.setField(PASSWORD_STORAGE_TYPE, id, 'password', await hash(password, this.saltRounds));
  }

  public async delete(id: string): Promise<void> {
    return this.storage.delete(PASSWORD_STORAGE_TYPE, id);
  }
}
