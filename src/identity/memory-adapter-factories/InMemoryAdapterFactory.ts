import type { Adapter } from 'oidc-provider';
import { MemoryAdapterFactory } from '../MemoryAdapterFactory';

export class InMemoryAdapterFactory extends MemoryAdapterFactory {
  public async createMemoryAdapter(): Promise<Adapter> {
    throw new Error('Method not implemented.');
  }
}
