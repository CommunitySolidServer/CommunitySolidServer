import { v4 } from 'uuid';
import type { ExpiringStorage } from '../../../../storage/keyvalue/ExpiringStorage';
import type { CookieStore } from './CookieStore';

/**
 * A {@link CookieStore} that uses an {@link ExpiringStorage} to keep track of the stored cookies.
 * Cookies have a specified time to live in seconds, default is 14 days,
 * after which they will be removed.
 */
export class BaseCookieStore implements CookieStore {
  private readonly storage: ExpiringStorage<string, string>;
  private readonly ttl: number;

  public constructor(storage: ExpiringStorage<string, string>, ttl = 14 * 24 * 60 * 60) {
    this.storage = storage;
    this.ttl = ttl * 1000;
  }

  public async generate(accountId: string): Promise<string> {
    const cookie = v4();
    await this.storage.set(cookie, accountId, this.ttl);
    return cookie;
  }

  public async get(cookie: string): Promise<string | undefined> {
    return this.storage.get(cookie);
  }

  public async refresh(cookie: string): Promise<Date | undefined> {
    const accountId = await this.storage.get(cookie);
    if (accountId) {
      await this.storage.set(cookie, accountId, this.ttl);
      return new Date(Date.now() + this.ttl);
    }
  }

  public async delete(cookie: string): Promise<boolean> {
    return this.storage.delete(cookie);
  }
}
