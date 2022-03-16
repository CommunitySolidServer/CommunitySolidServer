import { hash, compare } from 'bcryptjs';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { KeyValueStorage } from '../../../../storage/keyvalue/KeyValueStorage';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { ForbiddenHttpError } from '../../../../util/errors/ForbiddenHttpError';
import type { PasswordStore } from './PasswordStore';

/**
 * A payload to persist a user account
 */
export interface LoginPayload {
  accountId: string;
  password: string;
  verified: boolean;
}

/**
 * A {@link PasswordStore} that uses a {@link KeyValueStorage} to store the entries.
 * Passwords are hashed and salted.
 * Default `saltRounds` is 10.
 */
export class BasePasswordStore implements PasswordStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: KeyValueStorage<string, LoginPayload>;
  private readonly saltRounds: number;

  public constructor(storage: KeyValueStorage<string, LoginPayload>, saltRounds = 10) {
    this.storage = storage;
    this.saltRounds = saltRounds;
  }

  /**
   * Helper function that converts the given e-mail to a resource identifier
   * and retrieves the login data from the internal storage.
   *
   * Will error if `checkExistence` is true and there is no login data for that email.
   */
  private async getLoginPayload(email: string, checkExistence: true): Promise<{ key: string; payload: LoginPayload }>;
  private async getLoginPayload(email: string, checkExistence: false): Promise<{ key: string; payload?: LoginPayload }>;
  private async getLoginPayload(email: string, checkExistence: boolean):
  Promise<{ key: string; payload?: LoginPayload }> {
    const key = encodeURIComponent(email.toLowerCase());
    const payload = await this.storage.get(key);
    if (checkExistence && !payload) {
      this.logger.warn(`Trying to get account info for unknown email ${email}`);
      throw new ForbiddenHttpError('Login does not exist.');
    }
    return { key, payload };
  }

  public async get(email: string): Promise<string | undefined> {
    const { payload } = await this.getLoginPayload(email, false);
    return payload?.accountId;
  }

  public async authenticate(email: string, password: string): Promise<string> {
    const { payload } = await this.getLoginPayload(email, true);
    if (!payload.verified) {
      this.logger.warn(`Trying to get account info for unverified email ${email}`);
      throw new ForbiddenHttpError('Login still needs to be verified.');
    }
    if (!await compare(password, payload.password)) {
      this.logger.warn(`Incorrect password for email ${email}`);
      throw new ForbiddenHttpError('Incorrect password.');
    }
    return payload.accountId;
  }

  public async create(email: string, accountId: string, password: string): Promise<void> {
    const { key, payload } = await this.getLoginPayload(email, false);
    if (payload) {
      this.logger.warn(`Trying to create duplicate login for email ${email}`);
      throw new BadRequestHttpError('There already is a login for this e-mail address.');
    }
    await this.storage.set(key, {
      accountId,
      password: await hash(password, this.saltRounds),
      verified: false,
    });
  }

  public async confirmVerification(email: string): Promise<void> {
    const { key, payload } = await this.getLoginPayload(email, true);
    payload.verified = true;
    await this.storage.set(key, payload);
  }

  public async update(email: string, password: string): Promise<void> {
    const { key, payload } = await this.getLoginPayload(email, true);
    payload.password = await hash(password, this.saltRounds);
    await this.storage.set(key, payload);
  }

  public async delete(email: string): Promise<boolean> {
    const { key, payload } = await this.getLoginPayload(email, false);
    const exists = Boolean(payload);
    if (exists) {
      await this.storage.delete(key);
    }
    return exists;
  }
}
