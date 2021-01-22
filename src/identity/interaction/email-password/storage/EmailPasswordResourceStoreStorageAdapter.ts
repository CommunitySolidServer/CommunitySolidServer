import assert from 'assert';
import { hash, compare } from 'bcrypt';
import { v4 } from 'uuid';
import type { ResourceIdentifier } from '../../../../ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../../storage/ResourceStore';
import { trimTrailingSlashes } from '../../../../util/PathUtil';
import type { KeyValueInterface } from '../../../storage/getKeyValueInterfaceFromResourceStore';
import { getKeyValueInterfaceFromResourceStore } from '../../../storage/getKeyValueInterfaceFromResourceStore';
import { EmailPasswordStorageAdapter } from './EmailPasswordStorageAdapter';

export interface EmailPasswordResourceStoreStorageAdapterArgs {
  baseUrl: string;
  storagePathname: string;
  store: ResourceStore;
  saltRounds: number;
}

export interface EmailPasswordResourceStoreStorageAdapterAccountPayload {
  webId: string;
  email: string;
  password: string;
}

// Goddamn what a name! But it can't be called simply "ConfirmationRecordPayload" because
// this will be exported in index.ts and would conflict with any other libraries that may
// want a "ConfirmationRecordPayload". Maybe the naming should be reconsidered. How many
// characters is max for a variable name?
export interface EmailPasswordResourceStoreStorageAdapterForgotPasswordConfirmationRecordPayload {
  email: string;
  recordId: string;
}

export class EmailPasswordResourceStoreStorageAdapter extends EmailPasswordStorageAdapter {
  private readonly baseUrl: string;
  private readonly store: KeyValueInterface;
  private readonly saltRounds: number;

  public constructor(args: EmailPasswordResourceStoreStorageAdapterArgs) {
    super();
    this.baseUrl = `${trimTrailingSlashes(args.baseUrl)}${
      args.storagePathname
    }`;
    this.store = getKeyValueInterfaceFromResourceStore(args.store);
    this.saltRounds = args.saltRounds;
  }

  private getAccountResourceIdentifier(key: string): ResourceIdentifier {
    return { path: `${this.baseUrl}/${encodeURIComponent(key)}` };
  }

  private getForgotPasswordConfirmationRecordResourceIdentifier(
    key: string,
  ): ResourceIdentifier {
    return { path: `${this.baseUrl}/${encodeURIComponent(key)}` };
  }

  public async authenticate(email: string, password: string): Promise<string> {
    const account = (await this.store.get(
      this.getAccountResourceIdentifier(email),
    )) as EmailPasswordResourceStoreStorageAdapterAccountPayload;
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
    )) as EmailPasswordResourceStoreStorageAdapterAccountPayload;
    assert(!existingAccount, 'Account already exists');
    const payload: EmailPasswordResourceStoreStorageAdapterAccountPayload = {
      email,
      webId,
      password: await hash(password, this.saltRounds),
    };
    await this.store.set(resourceIdentifier, payload);
  }

  public async changePassword(email: string, password: string): Promise<void> {
    const account = (await this.store.get(
      this.getAccountResourceIdentifier(email),
    )) as EmailPasswordResourceStoreStorageAdapterAccountPayload;
    assert(account, 'Account does not exist');
    account.password = await hash(password, this.saltRounds);
    await this.store.set(this.getAccountResourceIdentifier(email), account);
  }

  public async deleteAccount(email: string): Promise<void> {
    await this.store.remove(this.getAccountResourceIdentifier(email));
  }

  public async generateForgotPasswordConfirmationRecord(
    email: string,
  ): Promise<string> {
    const recordId = v4();
    await this.store.set(
      this.getForgotPasswordConfirmationRecordResourceIdentifier(recordId),
      { recordId, email },
    );
    return recordId;
  }

  public async getForgotPasswordConfirmationRecord(
    recordId: string,
  ): Promise<string> {
    const forgotPasswordConfirmationRecord = (await this.store.get(
      this.getForgotPasswordConfirmationRecordResourceIdentifier(recordId),
    )) as EmailPasswordResourceStoreStorageAdapterForgotPasswordConfirmationRecordPayload;
    assert(forgotPasswordConfirmationRecord, 'The request no longer exists');
    return forgotPasswordConfirmationRecord.email;
  }

  public async deleteForgotPasswordConfirmationRecord(
    recordId: string,
  ): Promise<void> {
    await this.store.remove(
      this.getForgotPasswordConfirmationRecordResourceIdentifier(recordId),
    );
  }
}
