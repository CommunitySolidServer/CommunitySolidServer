import type { Adapter, AdapterConstructor } from 'oidc-provider';

export abstract class IdentityProviderAdapterFactory {
  public abstract createMemoryAdapter(): Adapter | AdapterConstructor;
}
