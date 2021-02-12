import type { Adapter, AdapterPayload } from 'oidc-provider';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { trimTrailingSlashes } from '../../util/PathUtil';
import type { KeyValueStore } from './KeyValueStore';
import { StorageAdapterFactory } from './StorageAdapterFactory';

export interface ResourceStoreStorageAdapterArgs {
  baseUrl: string;
  storagePathname: string;
  store: KeyValueStore;
}

export class ResourceStoreStorageAdapter implements Adapter {
  private readonly baseUrl: string;
  private readonly name: string;
  private readonly store: KeyValueStore;

  public constructor(name: string, args: ResourceStoreStorageAdapterArgs) {
    this.baseUrl = `${trimTrailingSlashes(args.baseUrl)}${
      args.storagePathname
    }`;
    this.name = name;
    this.store = args.store;
  }

  private grantKeyFor(id: string): ResourceIdentifier {
    return { path: `${this.baseUrl}/grant/${encodeURIComponent(id)}` };
  }

  private userCodeKeyFor(userCode: string): ResourceIdentifier {
    return {
      path: `${this.baseUrl}/user_code/${encodeURIComponent(userCode)}`,
    };
  }

  private uidKeyFor(uid: string): ResourceIdentifier {
    return { path: `${this.baseUrl}/uid/${encodeURIComponent(uid)}` };
  }

  private keyFor(id: string): ResourceIdentifier {
    return { path: `${this.baseUrl}/${this.name}/${encodeURIComponent(id)}` };
  }

  public async upsert(
    id: string,
    payload: AdapterPayload,
    expiresIn: number,
  ): Promise<undefined | void> {
    const expirationOptions = expiresIn ?
      { expires: new Date(Date.now() + (expiresIn * 1000)) } :
      undefined;
    const key = this.keyFor(id);

    const storagePromises: Promise<void>[] = [
      this.store.set(key, payload, expirationOptions),
    ];
    if (payload.grantId) {
      storagePromises.push(
        (async(): Promise<void> => {
          const grantKey = this.grantKeyFor(payload.grantId as string);
          const grants = (await this.store.get(grantKey) ||
            []) as ResourceIdentifier[];
          grants.push(key);
          await this.store.set(grantKey, grants, expirationOptions);
        })(),
      );
    }
    if (payload.userCode) {
      storagePromises.push(
        this.store.set(
          this.userCodeKeyFor(payload.userCode),
          id,
          expirationOptions,
        ),
      );
    }
    if (payload.uid) {
      storagePromises.push(
        this.store.set(this.uidKeyFor(payload.uid), id, expirationOptions),
      );
    }
    await Promise.all(storagePromises);
  }

  public async find(id: string): Promise<AdapterPayload | undefined | void> {
    return (await this.store.get(this.keyFor(id))) as
      | undefined
      | AdapterPayload;
  }

  public async findByUserCode(
    userCode: string,
  ): Promise<AdapterPayload | undefined | void> {
    const id = (await this.store.get(this.userCodeKeyFor(userCode))) as string;
    return this.find(id);
  }

  public async findByUid(
    uid: string,
  ): Promise<AdapterPayload | undefined | void> {
    const id = (await this.store.get(this.uidKeyFor(uid))) as string;
    return this.find(id);
  }

  public async destroy(id: string): Promise<undefined | void> {
    await this.store.remove(this.keyFor(id));
  }

  public async revokeByGrantId(grantId: string): Promise<undefined | void> {
    const grantKey = this.grantKeyFor(grantId);
    const grants = (await this.store.get(grantKey) ||
      []) as ResourceIdentifier[];
    const deletePromises: Promise<void>[] = [];
    grants.forEach((grant): void => {
      deletePromises.push(this.store.remove(grant));
    });
    deletePromises.push(this.store.remove(grantKey));
    await Promise.all(deletePromises);
  }

  public async consume(id: string): Promise<undefined | void> {
    const payload = await this.find(id);
    if (!payload) {
      return;
    }
    payload.consumed = Math.floor(Date.now() / 1000);
    await this.store.set(this.keyFor(id), payload);
  }
}

export class ResourceStoreStorageAdapterFactory extends StorageAdapterFactory {
  private readonly args: ResourceStoreStorageAdapterArgs;

  public constructor(args: ResourceStoreStorageAdapterArgs) {
    super();
    this.args = args;
  }

  public createStorageAdapter(name: string): Adapter {
    return new ResourceStoreStorageAdapter(name, this.args);
  }
}
