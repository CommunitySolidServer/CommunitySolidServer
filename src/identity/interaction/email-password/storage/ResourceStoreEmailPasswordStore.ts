import assert from 'assert';
import { hash, compare } from 'bcrypt';
import { v4 } from 'uuid';
import type { ResourceIdentifier } from '../../../../ldp/representation/ResourceIdentifier';
import { trimTrailingSlashes } from '../../../../util/PathUtil';
import type { KeyValueStore } from '../../../storage/KeyValueStore';
import { EmailPasswordStore } from './EmailPasswordStore';

export interface ResourceStoreEmailPasswordStoreArgs {
  baseUrl: string;
  storagePathname: string;
  store: KeyValueStore;
  saltRounds: number;
}

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

/**
 * A EmailPasswordStorageAdapter that uses a ResourceStore
 * to persist its information.
 */
export class ResourceStoreEmailPasswordStore extends EmailPasswordStore {
  private readonly baseUrl: string;
  private readonly store: KeyValueStore;
  private readonly saltRounds: number;

  public constructor(args: ResourceStoreEmailPasswordStoreArgs) {
    super();
    this.baseUrl = `${trimTrailingSlashes(args.baseUrl)}${
      args.storagePathname
    }`;
    this.store = args.store;
    this.saltRounds = args.saltRounds;
  }

  private getAccountResourceIdentifier(key: string): ResourceIdentifier {
    return { path: `${this.baseUrl}/account/${encodeURIComponent(key)}` };
  }

  private getForgotPasswordRecordResourceIdentifier(
    key: string,
  ): ResourceIdentifier {
    return { path: `${this.baseUrl}/forgot-password-resource-identifier/${encodeURIComponent(key)}` };
  }

  public async authenticate(email: string, password: string): Promise<string> {
    const account = (await this.store.get(
      this.getAccountResourceIdentifier(email),
    )) as EmailPasswordAccountPayload;
    assert(account, 'No account by that email');
    assert(await compare(password, account.password), 'Incorrect password');
    return account.webId;
  }

  public async create(
    email: string,
    webId: string,
    password: string,
  ): Promise<void> {
    const resourceIdentifier = this.getAccountResourceIdentifier(email);
    const existingAccount = (await this.store.get(
      resourceIdentifier,
    )) as EmailPasswordAccountPayload;
    assert(!existingAccount, 'Account already exists');
    const payload: EmailPasswordAccountPayload = {
      email,
      webId,
      password: await hash(password, this.saltRounds),
    };
    await this.store.set(resourceIdentifier, payload);
  }

  public async changePassword(email: string, password: string): Promise<void> {
    const account = (await this.store.get(
      this.getAccountResourceIdentifier(email),
    )) as EmailPasswordAccountPayload;
    assert(account, 'Account does not exist');
    account.password = await hash(password, this.saltRounds);
    await this.store.set(this.getAccountResourceIdentifier(email), account);
  }

  public async deleteAccount(email: string): Promise<void> {
    await this.store.remove(this.getAccountResourceIdentifier(email));
  }

  public async generateForgotPasswordRecord(
    email: string,
  ): Promise<string> {
    const recordId = v4();
    assert(
      await this.store.get(this.getAccountResourceIdentifier(email)),
      'Accound does not exist',
    );
    await this.store.set(
      this.getForgotPasswordRecordResourceIdentifier(recordId),
      { recordId, email },
    );
    return recordId;
  }

  public async getForgotPasswordRecord(
    recordId: string,
  ): Promise<string | undefined> {
    const forgotPasswordRecord = (await this.store.get(
      this.getForgotPasswordRecordResourceIdentifier(recordId),
    )) as EmailPasswordForgotPasswordPayload;
    if (!forgotPasswordRecord) {
      return;
    }
    return forgotPasswordRecord.email;
  }

  public async deleteForgotPasswordRecord(
    recordId: string,
  ): Promise<void> {
    await this.store.remove(
      this.getForgotPasswordRecordResourceIdentifier(recordId),
    );
  }
}
