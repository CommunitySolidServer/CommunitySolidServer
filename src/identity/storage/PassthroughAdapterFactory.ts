import type { Adapter, AdapterPayload } from 'oidc-provider';
import type { AdapterFactory } from './AdapterFactory';

/**
 * OIDC Adapter that calls the corresponding functions of the source Adapter.
 * Can be extended by adapters that do not want to override all functions
 * by implementing a decorator pattern.
 */
export class PassthroughAdapter implements Adapter {
  protected readonly name: string;
  protected readonly source: Adapter;

  public constructor(name: string, source: Adapter) {
    this.name = name;
    this.source = source;
  }

  public async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<void | undefined> {
    return this.source.upsert(id, payload, expiresIn);
  }

  public async find(id: string): Promise<AdapterPayload | void | undefined> {
    return this.source.find(id);
  }

  public async findByUserCode(userCode: string): Promise<AdapterPayload | void | undefined> {
    return this.source.findByUserCode(userCode);
  }

  public async findByUid(uid: string): Promise<AdapterPayload | void | undefined> {
    return this.source.findByUid(uid);
  }

  public async consume(id: string): Promise<void | undefined> {
    return this.source.consume(id);
  }

  public async destroy(id: string): Promise<void | undefined> {
    return this.source.destroy(id);
  }

  public async revokeByGrantId(grantId: string): Promise<void | undefined> {
    return this.source.revokeByGrantId(grantId);
  }
}

export class PassthroughAdapterFactory implements AdapterFactory {
  protected readonly source: AdapterFactory;

  public constructor(source: AdapterFactory) {
    this.source = source;
  }

  public createStorageAdapter(name: string): Adapter {
    return this.source.createStorageAdapter(name);
  }
}
