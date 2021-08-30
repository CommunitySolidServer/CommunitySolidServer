import assert from 'assert';
import { hash, compare } from 'bcrypt';
import { v4 } from 'uuid';
import type { KeyValueStorage } from '../../../../storage/keyvalue/KeyValueStorage';
import type { AccountSettings, AccountStore } from './AccountStore';

/**
 * A payload to persist a user account
 */
export interface AccountPayload {
  webId: string;
  email: string;
  password: string;
  verified: boolean;
}

/**
 * A payload to persist the fact that a user
 * has requested to reset their password
 */
export interface ForgotPasswordPayload {
  email: string;
  recordId: string;
}

export type EmailPasswordData = AccountPayload | ForgotPasswordPayload | AccountSettings;

/**
 * A EmailPasswordStore that uses a KeyValueStorage
 * to persist its information.
 */
export class BaseAccountStore implements AccountStore {
  private readonly storage: KeyValueStorage<string, EmailPasswordData>;
  private readonly saltRounds: number;

  public constructor(storage: KeyValueStorage<string, EmailPasswordData>, saltRounds: number) {
    this.storage = storage;
    this.saltRounds = saltRounds;
  }

  /**
   * Generates a ResourceIdentifier to store data for the given email.
   */
  private getAccountResourceIdentifier(email: string): string {
    return `account/${encodeURIComponent(email)}`;
  }

  /**
   * Generates a ResourceIdentifier to store data for the given recordId.
   */
  private getForgotPasswordRecordResourceIdentifier(recordId: string): string {
    return `forgot-password-resource-identifier/${encodeURIComponent(recordId)}`;
  }

  /* eslint-disable lines-between-class-members */
  /**
   * Helper function that converts the given e-mail to an account identifier
   * and retrieves the account data from the internal storage.
   *
   * Will error if `checkExistence` is true and the account does not exist.
   */
  private async getAccountPayload(email: string, checkExistence: true):
  Promise<{ key: string; account: AccountPayload }>;
  private async getAccountPayload(email: string, checkExistence: false):
  Promise<{ key: string; account?: AccountPayload }>;
  private async getAccountPayload(email: string, checkExistence: boolean):
  Promise<{ key: string; account?: AccountPayload }> {
    const key = this.getAccountResourceIdentifier(email);
    const account = await this.storage.get(key) as AccountPayload | undefined;
    assert(!checkExistence || account, 'Account does not exist');
    return { key, account };
  }
  /* eslint-enable lines-between-class-members */

  public async authenticate(email: string, password: string): Promise<string> {
    const { account } = await this.getAccountPayload(email, true);
    assert(account.verified, 'Account still needs to be verified');
    assert(await compare(password, account.password), 'Incorrect password');
    return account.webId;
  }

  public async create(email: string, webId: string, password: string, settings: AccountSettings): Promise<void> {
    const { key, account } = await this.getAccountPayload(email, false);
    assert(!account, 'Account already exists');
    // Make sure there is no other account for this WebID
    const storedSettings = await this.storage.get(webId);
    assert(!storedSettings, 'There already is an account for this WebID');
    const payload: AccountPayload = {
      email,
      password: await hash(password, this.saltRounds),
      verified: false,
      webId,
    };
    await this.storage.set(key, payload);
    await this.storage.set(webId, settings);
  }

  public async verify(email: string): Promise<void> {
    const { key, account } = await this.getAccountPayload(email, true);
    account.verified = true;
    await this.storage.set(key, account);
  }

  public async changePassword(email: string, password: string): Promise<void> {
    const { key, account } = await this.getAccountPayload(email, true);
    account.password = await hash(password, this.saltRounds);
    await this.storage.set(key, account);
  }

  public async getSettings(webId: string): Promise<AccountSettings> {
    const settings = await this.storage.get(webId) as AccountSettings | undefined;
    assert(settings, 'Account does not exist');
    return settings;
  }

  public async updateSettings(webId: string, settings: AccountSettings): Promise<void> {
    const oldSettings = await this.storage.get(webId);
    assert(oldSettings, 'Account does not exist');
    await this.storage.set(webId, settings);
  }

  public async deleteAccount(email: string): Promise<void> {
    const { key, account } = await this.getAccountPayload(email, false);
    if (account) {
      await this.storage.delete(key);
      await this.storage.delete(account.webId);
    }
  }

  public async generateForgotPasswordRecord(email: string): Promise<string> {
    const recordId = v4();
    await this.getAccountPayload(email, true);
    await this.storage.set(
      this.getForgotPasswordRecordResourceIdentifier(recordId),
      { recordId, email },
    );
    return recordId;
  }

  public async getForgotPasswordRecord(recordId: string): Promise<string | undefined> {
    const identifier = this.getForgotPasswordRecordResourceIdentifier(recordId);
    const forgotPasswordRecord = await this.storage.get(identifier) as ForgotPasswordPayload | undefined;
    return forgotPasswordRecord?.email;
  }

  public async deleteForgotPasswordRecord(recordId: string): Promise<void> {
    await this.storage.delete(this.getForgotPasswordRecordResourceIdentifier(recordId));
  }
}
