import assert from 'assert';
import { hash, compare } from 'bcrypt';
import { v4 } from 'uuid';
import { BasicRepresentation } from '../../../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../../../ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../../storage/ResourceStore';
import { APPLICATION_OCTET_STREAM } from '../../../../util/ContentTypes';
import { trimTrailingSlashes } from '../../../../util/PathUtil';
import { readableToString } from '../../../../util/StreamUtil';
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
  private readonly store: ResourceStore;
  private readonly saltRounds: number;

  public constructor(args: EmailPasswordResourceStoreStorageAdapterArgs) {
    super();
    this.baseUrl = `${trimTrailingSlashes(args.baseUrl)}${args.storagePathname}`;
    this.store = args.store;
    this.saltRounds = args.saltRounds;
  }

  private getAccountResourceIdentifier(key: string): ResourceIdentifier {
    return { path: `${this.baseUrl}/${encodeURIComponent(key)}` };
  }

  private getForgotPasswordConfirmationRecordResourceIdentifier(key: string): ResourceIdentifier {
    return { path: `${this.baseUrl}/${encodeURIComponent(key)}` };
  }

  private async get<T>(resourceIdentifier: ResourceIdentifier): Promise<T | undefined> {
    try {
      const representation: Representation =
        await this.store.getRepresentation(resourceIdentifier, {});
      return JSON.parse(
        await readableToString(representation.data),
      ) as T | undefined;
    } catch {
      // Do nothing just return undefined
    }
  }

  private async set<T>(resourceIdentifier: ResourceIdentifier, payload: T): Promise<void> {
    await this.store.setRepresentation(
      resourceIdentifier,
      new BasicRepresentation(
        JSON.stringify(payload),
        resourceIdentifier,
        APPLICATION_OCTET_STREAM,
      ),
    );
  }

  private async delete(identifier: ResourceIdentifier): Promise<void> {
    await this.store.deleteResource(identifier);
  }

  public async authenticate(email: string, password: string): Promise<string> {
    const account =
      await this.get<EmailPasswordResourceStoreStorageAdapterAccountPayload>(this.getAccountResourceIdentifier(email));
    assert(account, 'No account by that email');
    assert(await compare(password, account.password), 'Incorrect password');
    return account.webId;
  }

  public async create(email: string, webId: string, password: string): Promise<void> {
    const resourceIdentifier = this.getAccountResourceIdentifier(email);
    const existingAccount =
      await this.get<EmailPasswordResourceStoreStorageAdapterAccountPayload>(resourceIdentifier);
    assert(!existingAccount, 'Account already exists');
    const payload: EmailPasswordResourceStoreStorageAdapterAccountPayload = {
      email,
      webId,
      password: await hash(password, this.saltRounds),
    };
    await this.set<EmailPasswordResourceStoreStorageAdapterAccountPayload>(resourceIdentifier, payload);
  }

  public async changePassword(email: string, password: string): Promise<void> {
    const account =
      await this.get<EmailPasswordResourceStoreStorageAdapterAccountPayload>(this.getAccountResourceIdentifier(email));
    assert(account, 'Account does not exist');
    account.password = await hash(password, this.saltRounds);
    await this.set<EmailPasswordResourceStoreStorageAdapterAccountPayload>(
      this.getAccountResourceIdentifier(email),
      account,
    );
  }

  public async deleteAccount(email: string): Promise<void> {
    await this.delete(this.getAccountResourceIdentifier(email));
  }

  public async generateForgotPasswordConfirmationRecord(email: string): Promise<string> {
    const recordId = v4();
    await this.set<EmailPasswordResourceStoreStorageAdapterForgotPasswordConfirmationRecordPayload>(
      this.getForgotPasswordConfirmationRecordResourceIdentifier(recordId),
      { recordId, email },
    );
    return recordId;
  }

  public async getForgotPasswordConfirmationRecord(recordId: string): Promise<string> {
    const forgotPasswordConfirmationRecord =
      await this.get<EmailPasswordResourceStoreStorageAdapterForgotPasswordConfirmationRecordPayload>(
        this.getForgotPasswordConfirmationRecordResourceIdentifier(recordId),
      );
    assert(forgotPasswordConfirmationRecord, 'The request no longer exists');
    return forgotPasswordConfirmationRecord.email;
  }

  public async deleteForgotPasswordConfirmationRecord(recordId: string): Promise<void> {
    await this.delete(this.getForgotPasswordConfirmationRecordResourceIdentifier(recordId));
  }
}
