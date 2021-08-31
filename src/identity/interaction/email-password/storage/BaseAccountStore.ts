import assert from 'assert';
import { hash, compare } from 'bcrypt';
import { v4 } from 'uuid';
import type { KeyValueStorage } from '../../../../storage/keyvalue/KeyValueStorage';
import type { AccountStore } from './AccountStore';

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

export type EmailPasswordData = AccountPayload | ForgotPasswordPayload;

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

  /**
   * Helper function that converts the given e-mail to an account identifier
   * and retrieves the account data from the internal storage.
   */
  private async getAccountPayload(email: string): Promise<{ key: string; account?: AccountPayload }> {
    const key = this.getAccountResourceIdentifier(email);
    const account = await this.storage.get(key) as AccountPayload | undefined;
    return { key, account };
  }

  public async authenticate(email: string, password: string): Promise<string> {
    const { account } = await this.getAccountPayload(email);
    assert(account, 'No account by that email');
    assert(account.verified, 'Account still needs to be verified');
    assert(await compare(password, account.password), 'Incorrect password');
    return account.webId;
  }

  public async create(email: string, webId: string, password: string): Promise<void> {
    const { key, account } = await this.getAccountPayload(email);
    assert(!account, 'Account already exists');
    const payload: AccountPayload = {
      email,
      webId,
      password: await hash(password, this.saltRounds),
      verified: false,
    };
    await this.storage.set(key, payload);
  }

  public async verify(email: string): Promise<void> {
    const { key, account } = await this.getAccountPayload(email);
    assert(account, 'Account does not exist');
    account.verified = true;
    await this.storage.set(key, account);
  }

  public async changePassword(email: string, password: string): Promise<void> {
    const { key, account } = await this.getAccountPayload(email);
    assert(account, 'Account does not exist');
    account.password = await hash(password, this.saltRounds);
    await this.storage.set(key, account);
  }

  public async deleteAccount(email: string): Promise<void> {
    await this.storage.delete(this.getAccountResourceIdentifier(email));
  }

  public async generateForgotPasswordRecord(email: string): Promise<string> {
    const recordId = v4();
    const { account } = await this.getAccountPayload(email);
    assert(account, 'Account does not exist');
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
