import { v4 } from 'uuid';
import type { ExpiringStorage } from '../../../../storage/keyvalue/ExpiringStorage';
import type { ForgotPasswordStore } from './ForgotPasswordStore';

/**
 * A {@link ForgotPasswordStore} using an {@link ExpiringStorage} to hold the necessary records.
 */
export class BaseForgotPasswordStore implements ForgotPasswordStore {
  private readonly storage: ExpiringStorage<string, string>;
  private readonly ttl: number;

  public constructor(storage: ExpiringStorage<string, string>, ttl = 15) {
    this.storage = storage;
    this.ttl = ttl * 60 * 1000;
  }

  public async generate(email: string): Promise<string> {
    const recordId = v4();
    await this.storage.set(recordId, email, this.ttl);
    return recordId;
  }

  public async get(recordId: string): Promise<string | undefined> {
    return this.storage.get(recordId);
  }

  public async delete(recordId: string): Promise<boolean> {
    return this.storage.delete(recordId);
  }
}
