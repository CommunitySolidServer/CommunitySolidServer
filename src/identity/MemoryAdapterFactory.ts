import type { Adapter } from 'oidc-provider';

export abstract class MemoryAdapterFactory {
  public abstract createMemoryAdapter(): Promise<Adapter>;
}
