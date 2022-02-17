import { getLoggerFor } from '../logging/LogUtil';
import type { KeyValueStorage } from '../storage/keyvalue/KeyValueStorage';
import { Initializer } from './Initializer';

/**
 * Stores the `baseUrl` value that was used to start the server
 * and warns the user in case it differs from the previous one.
 */
export class BaseUrlVerifier extends Initializer {
  private readonly baseUrl: string;
  private readonly storageKey: string;
  private readonly storage: KeyValueStorage<string, string>;

  private readonly logger = getLoggerFor(this);

  public constructor(baseUrl: string, storageKey: string, storage: KeyValueStorage<string, string>) {
    super();
    this.baseUrl = baseUrl;
    this.storageKey = storageKey;
    this.storage = storage;
  }

  public async handle(): Promise<void> {
    const previousValue = await this.storage.get(this.storageKey);
    if (previousValue && this.baseUrl !== previousValue) {
      this.logger.warn(`The server is being started with a base URL of ${this.baseUrl
      } while it was previously started with ${previousValue
      }. Resources generated with the previous server instance, such as a WebID, might no longer work correctly.`);
    }
    await this.storage.set(this.storageKey, this.baseUrl);
  }
}
