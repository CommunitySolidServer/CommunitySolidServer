import type { Adapter, AdapterPayload } from 'oidc-provider';
import { getLoggerFor } from '../../logging/LogUtil';
import type { ExpiringStorage } from '../../storage/keyvalue/ExpiringStorage';
import type { AdapterFactory } from './AdapterFactory';

export interface ExpiringAdapterArgs {
  storageName: string;
  storage: ExpiringStorage<string, unknown>;
}

/**
 * An IDP storage adapter that uses an ExpiringStorage
 * to persist data.
 */
export class ExpiringAdapter implements Adapter {
  protected readonly logger = getLoggerFor(this);

  private readonly storageName: string;
  private readonly name: string;
  private readonly storage: ExpiringStorage<string, unknown>;

  public constructor(name: string, args: ExpiringAdapterArgs) {
    this.name = name;
    this.storageName = args.storageName;
    this.storage = args.storage;
  }

  private grantKeyFor(id: string): string {
    return `${this.storageName}/grant/${encodeURIComponent(id)}`;
  }

  private userCodeKeyFor(userCode: string): string {
    return `${this.storageName}/user_code/${encodeURIComponent(userCode)}`;
  }

  private uidKeyFor(uid: string): string {
    return `${this.storageName}/uid/${encodeURIComponent(uid)}`;
  }

  private keyFor(id: string): string {
    return `${this.storageName}/${this.name}/${encodeURIComponent(id)}`;
  }

  public async upsert(id: string, payload: AdapterPayload, expiresIn?: number): Promise<void> {
    // Despite what the typings say, `expiresIn` can be undefined
    const expires = expiresIn ? new Date(Date.now() + (expiresIn * 1000)) : undefined;
    const key = this.keyFor(id);

    this.logger.debug(`Storing payload data for ${id}`);

    const storagePromises: Promise<unknown>[] = [
      this.storage.set(key, payload, expires),
    ];
    if (payload.grantId) {
      storagePromises.push(
        (async(): Promise<void> => {
          const grantKey = this.grantKeyFor(payload.grantId as string);
          const grants = (await this.storage.get(grantKey) || []) as string[];
          grants.push(key);
          await this.storage.set(grantKey, grants, expires);
        })(),
      );
    }
    if (payload.userCode) {
      storagePromises.push(this.storage.set(this.userCodeKeyFor(payload.userCode), id, expires));
    }
    if (payload.uid) {
      storagePromises.push(this.storage.set(this.uidKeyFor(payload.uid), id, expires));
    }
    await Promise.all(storagePromises);
  }

  public async find(id: string): Promise<AdapterPayload | void> {
    return await this.storage.get(this.keyFor(id)) as AdapterPayload | undefined;
  }

  public async findByUserCode(userCode: string): Promise<AdapterPayload | void> {
    const id = await this.storage.get(this.userCodeKeyFor(userCode)) as string;
    return this.find(id);
  }

  public async findByUid(uid: string): Promise<AdapterPayload | void> {
    const id = await this.storage.get(this.uidKeyFor(uid)) as string;
    return this.find(id);
  }

  public async destroy(id: string): Promise<void> {
    await this.storage.delete(this.keyFor(id));
  }

  public async revokeByGrantId(grantId: string): Promise<void> {
    this.logger.debug(`Revoking grantId ${grantId}`);
    const grantKey = this.grantKeyFor(grantId);
    const grants = await this.storage.get(grantKey) as string[] | undefined;
    if (!grants) {
      return;
    }
    const deletePromises: Promise<unknown>[] = [];
    grants.forEach((grant): void => {
      deletePromises.push(this.storage.delete(grant));
    });
    deletePromises.push(this.storage.delete(grantKey));
    await Promise.all(deletePromises);
  }

  public async consume(id: string): Promise<void> {
    const payload = await this.find(id);
    if (!payload) {
      return;
    }
    payload.consumed = Math.floor(Date.now() / 1000);
    await this.storage.set(this.keyFor(id), payload);
  }
}

/**
 * The factory for a ExpiringStorageAdapter
 */
export class ExpiringAdapterFactory implements AdapterFactory {
  private readonly args: ExpiringAdapterArgs;

  public constructor(args: ExpiringAdapterArgs) {
    this.args = args;
  }

  public createStorageAdapter(name: string): ExpiringAdapter {
    return new ExpiringAdapter(name, this.args);
  }
}
