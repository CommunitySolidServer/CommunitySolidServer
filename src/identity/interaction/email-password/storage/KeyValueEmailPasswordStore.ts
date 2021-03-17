import assert from 'assert';
import { hash, compare } from 'bcrypt';
import { v4 } from 'uuid';
import type { ResourceIdentifier } from '../../../../ldp/representation/ResourceIdentifier';
import type { KeyValueStorage } from '../../../../storage/keyvalue/KeyValueStorage';
import { trimTrailingSlashes } from '../../../../util/PathUtil';
import { EmailPasswordStore } from './EmailPasswordStore';

/**
 * A payload to persist a user account
 */
export interface EmailPasswordAccountPayload {
  webId: string;
  email: string;
  password: string;
}

/**
 * A payload to persist the fact that a user
 * has requested to reset their password
 */
export interface EmailPasswordForgotPasswordPayload {
  email: string;
  recordId: string;
}

export type EmailPasswordData = EmailPasswordAccountPayload | EmailPasswordForgotPasswordPayload;

export interface ResourceStoreEmailPasswordStoreArgs {
  baseUrl: string;
  storagePathName: string;
  storage: KeyValueStorage<ResourceIdentifier, EmailPasswordData>;
  saltRounds: number;
}

/**
 * A EmailPasswordStore that uses a KeyValueStorage
 * to persist its information.
 */
export class KeyValueEmailPasswordStore extends EmailPasswordStore {
  private readonly baseUrl: string;
  private readonly storage: KeyValueStorage<ResourceIdentifier, EmailPasswordData>;
  private readonly saltRounds: number;

  public constructor(args: ResourceStoreEmailPasswordStoreArgs) {
    super();
    if (!args.storagePathName.startsWith('/')) {
      throw new Error('storagePathName should start with a slash.');
    }
    this.baseUrl = `${trimTrailingSlashes(args.baseUrl)}${args.storagePathName}`;
    this.storage = args.storage;
    this.saltRounds = args.saltRounds;
  }

  /**
   * Generates a ResourceIdentifier to store data for the given email.
   */
  private getAccountResourceIdentifier(email: string): ResourceIdentifier {
    return { path: `${this.baseUrl}/account/${encodeURIComponent(email)}` };
  }

  /**
   * Generates a ResourceIdentifier to store data for the given recordId.
   */
  private getForgotPasswordRecordResourceIdentifier(recordId: string): ResourceIdentifier {
    return { path: `${this.baseUrl}/forgot-password-resource-identifier/${encodeURIComponent(recordId)}` };
  }

  /**
   * Helper function that converts the given e-mail to an account identifier
   * and retrieves the account data from the internal storage.
   */
  private async getAccountPayload(email: string):
  Promise<{ identifier: ResourceIdentifier; account?: EmailPasswordAccountPayload }> {
    const identifier = this.getAccountResourceIdentifier(email);
    const account = await this.storage.get(identifier) as EmailPasswordAccountPayload | undefined;
    return { identifier, account };
  }

  public async authenticate(email: string, password: string): Promise<string> {
    const { account } = await this.getAccountPayload(email);
    assert(account, 'No account by that email');
    assert(await compare(password, account.password), 'Incorrect password');
    return account.webId;
  }

  public async create(email: string, webId: string, password: string): Promise<void> {
    const { identifier, account } = await this.getAccountPayload(email);
    assert(!account, 'Account already exists');
    const payload: EmailPasswordAccountPayload = {
      email,
      webId,
      password: await hash(password, this.saltRounds),
    };
    await this.storage.set(identifier, payload);
  }

  public async changePassword(email: string, password: string): Promise<void> {
    const { identifier, account } = await this.getAccountPayload(email);
    assert(account, 'Account does not exist');
    account.password = await hash(password, this.saltRounds);
    await this.storage.set(identifier, account);
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
    const forgotPasswordRecord = await this.storage.get(identifier) as EmailPasswordForgotPasswordPayload | undefined;
    return forgotPasswordRecord?.email;
  }

  public async deleteForgotPasswordRecord(recordId: string): Promise<void> {
    await this.storage.delete(this.getForgotPasswordRecordResourceIdentifier(recordId));
  }
}
