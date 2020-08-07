import { Operation } from '../operations/Operation';
import { PermissionSet } from './PermissionSet';
import { PermissionsExtractor } from './PermissionsExtractor';

/**
 * Makes some simplified assumption based on the {@link Operation} method to generate a {@link PermissionSet}.
 */
export class SimplePermissionsExtractor extends PermissionsExtractor {
  public async canHandle(): Promise<void> {
    // Supports all operations
  }

  public async handle(input: Operation): Promise<PermissionSet> {
    const result = {
      read: input.method === 'GET',
      append: false,
      write: input.method === 'POST' || input.method === 'PUT' || input.method === 'DELETE',
    };
    result.append = result.write;
    return result;
  }
}
