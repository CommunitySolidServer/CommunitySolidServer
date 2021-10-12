import { promises as fsPromises } from 'fs';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { isSystemError } from '../../util/errors/SystemError';
import type { ReadWriteLocker } from '../../util/locking/ReadWriteLocker';
import type { KeyValueStorage } from './KeyValueStorage';

/**
 * Uses a JSON file to store key/value pairs.
 */
export class JsonFileStorage implements KeyValueStorage<string, unknown> {
  private readonly filePath: string;
  private readonly locker: ReadWriteLocker;
  private readonly lockIdentifier: ResourceIdentifier;

  public constructor(filePath: string, locker: ReadWriteLocker) {
    this.filePath = filePath;
    this.locker = locker;

    // Using file path as identifier for the lock as it should be unique for this file
    this.lockIdentifier = { path: filePath };
  }

  public async get(key: string): Promise<unknown | undefined> {
    const json = await this.getJsonSafely();
    return json[key];
  }

  public async has(key: string): Promise<boolean> {
    const json = await this.getJsonSafely();
    return typeof json[key] !== 'undefined';
  }

  public async set(key: string, value: unknown): Promise<this> {
    return this.updateJsonSafely((json: NodeJS.Dict<unknown>): this => {
      json[key] = value;
      return this;
    });
  }

  public async delete(key: string): Promise<boolean> {
    return this.updateJsonSafely((json: NodeJS.Dict<unknown>): boolean => {
      if (typeof json[key] !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete json[key];
        return true;
      }
      return false;
    });
  }

  public async* entries(): AsyncIterableIterator<[ string, unknown ]> {
    const json = await this.getJsonSafely();
    yield* Object.entries(json);
  }

  /**
   * Acquires the data in the JSON file while using a read lock.
   */
  private async getJsonSafely(): Promise<NodeJS.Dict<unknown>> {
    return this.locker.withReadLock(this.lockIdentifier, this.getJson.bind(this));
  }

  /**
   * Updates the data in the JSON file while using a write lock.
   * @param updateFn - A function that updates the JSON object.
   *
   * @returns The return value of `updateFn`.
   */
  private async updateJsonSafely<T>(updateFn: (json: NodeJS.Dict<unknown>) => T): Promise<T> {
    return this.locker.withWriteLock(this.lockIdentifier, async(): Promise<T> => {
      const json = await this.getJson();
      const result = updateFn(json);
      const updatedText = JSON.stringify(json, null, 2);
      await fsPromises.writeFile(this.filePath, updatedText, 'utf8');
      return result;
    });
  }

  /**
   * Reads and parses the data from the JSON file (without locking).
   */
  private async getJson(): Promise<NodeJS.Dict<unknown>> {
    try {
      const text = await fsPromises.readFile(this.filePath, 'utf8');
      return JSON.parse(text);
    } catch (error: unknown) {
      if (isSystemError(error) && error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }
}
