import { Operation } from '../operations/Operation';
import { PermissionSet } from './PermissionSet';
import { PermissionsExtractor } from './PermissionsExtractor';

export class SimplePermissionsExtractor extends PermissionsExtractor {
  public async canHandle(): Promise<void> {
    return undefined;
  }

  public async handle(input: Operation): Promise<PermissionSet> {
    return {
      read: input.method === 'GET',
      append: false,
      write: input.method === 'POST' || input.method === 'PUT',
      delete: input.method === 'DELETE',
    };
  }
}
