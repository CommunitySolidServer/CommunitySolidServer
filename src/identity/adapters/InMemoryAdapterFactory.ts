import type { AdapterConstructor } from 'oidc-provider';
import { IdentityProviderAdapterFactory } from '../IdentityProviderAdapterFactory';
import { inMemoryAdapterConstructor } from './InMemoryAdapterConstructor';

export class InMemoryAdapterFactory extends IdentityProviderAdapterFactory {
  public createMemoryAdapter(): AdapterConstructor {
    return inMemoryAdapterConstructor;
  }
}
