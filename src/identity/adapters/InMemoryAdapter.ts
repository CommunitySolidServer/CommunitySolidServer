import LRUCache from 'lru-cache';
import type { Adapter, AdapterPayload } from 'oidc-provider';

export class InMemoryAdapter implements Adapter {
  private readonly model: string;
  private readonly lru: LRUCache<string, string | string[] | AdapterPayload>;

  public constructor(model: string) {
    this.model = model;
    this.lru = new LRUCache<string, string | string[]>({});
  }

  private key(id: string): string {
    return `${this.model}:${id}`;
  }

  private static grantKeyFor(id: string): string {
    return `grant:${id}`;
  }

  private static sessionUidKeyFor(id: string): string {
    return `sessionUid:${id}`;
  }

  private static userCodeKeyFor(userCode: string): string {
    return `userCode:${userCode}`;
  }

  private static epochTime(): number {
    return Math.floor(Date.now() / 1000);
  }

  public async consume(id: string): Promise<undefined | void> {
    (this.lru.get(this.key(id)) as AdapterPayload).consumed = InMemoryAdapter.epochTime();
  }

  public async destroy(id: string): Promise<undefined | void> {
    const key = this.key(id);
    this.lru.del(key);
  }

  public async find(id: string): Promise<AdapterPayload | undefined | void> {
    return this.lru.get(this.key(id)) as AdapterPayload | undefined;
  }

  public async findByUid(uid: string): Promise<AdapterPayload | undefined | void> {
    const id = this.lru.get(InMemoryAdapter.sessionUidKeyFor(uid));
    return this.find(id as string);
  }

  public async findByUserCode(userCode: string): Promise<AdapterPayload | undefined | void> {
    const id = this.lru.get(InMemoryAdapter.userCodeKeyFor(userCode));
    return this.find(id as string);
  }

  public async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<undefined | void> {
    const key: string = this.key(id);

    if (this.model === 'Session') {
      this.lru.set(InMemoryAdapter.sessionUidKeyFor(payload.uid as string), id, expiresIn * 1000);
    }

    const { grantId, userCode } = payload;
    if (grantId) {
      const grantKey = InMemoryAdapter.grantKeyFor(grantId);
      const grant = this.lru.get(grantKey);
      if (!grant) {
        this.lru.set(grantKey, [ key ]);
      } else {
        (grant as string[]).push(key);
      }
    }

    if (userCode) {
      this.lru.set(InMemoryAdapter.userCodeKeyFor(userCode), id, expiresIn * 1000);
    }

    this.lru.set(key, payload, expiresIn * 1000);
  }

  public async revokeByGrantId(grantId: string): Promise<undefined | void> {
    const grantKey = InMemoryAdapter.grantKeyFor(grantId);
    const grant = this.lru.get(grantKey);
    if (grant) {
      (grant as string[]).forEach((token): void => this.lru.del(token));
      this.lru.del(grantKey);
    }
  }
}
