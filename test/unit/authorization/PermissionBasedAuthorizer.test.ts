import type { AuthorizerInput } from '../../../src/authorization/Authorizer';
import { PermissionBasedAuthorizer } from '../../../src/authorization/PermissionBasedAuthorizer';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { UnauthorizedHttpError } from '../../../src/util/errors/UnauthorizedHttpError';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';

describe('A PermissionBasedAuthorizer', (): void => {
  const identifier = { path: 'http://example.com/foo' };
  let input: AuthorizerInput;
  let authorizer: PermissionBasedAuthorizer;

  beforeEach(async(): Promise<void> => {
    input = {
      requestedModes: new IdentifierSetMultiMap(),
      availablePermissions: new IdentifierMap(),
      credentials: {},
    };

    authorizer = new PermissionBasedAuthorizer();
  });

  it('can handle any input.', async(): Promise<void> => {
    await expect(authorizer.canHandle(input)).resolves.toBeUndefined();
  });

  it('allows access if the permissions are matched by the reader output.', async(): Promise<void> => {
    input.requestedModes = new IdentifierSetMultiMap<AccessMode>(
      [[ identifier, AccessMode.read ], [ identifier, AccessMode.write ]],
    );
    input.availablePermissions = new IdentifierMap([[ identifier, { read: true, write: true }]]);
    await expect(authorizer.handle(input)).resolves.toBeUndefined();
  });

  it('throws an UnauthorizedHttpError when an unauthenticated request has no access.', async(): Promise<void> => {
    input.requestedModes = new IdentifierSetMultiMap<AccessMode>(
      [[ identifier, AccessMode.read ], [ identifier, AccessMode.write ]],
    );
    input.availablePermissions = new IdentifierMap([[ identifier, { read: true, write: false }]]);
    await expect(authorizer.handle(input)).rejects.toThrow(UnauthorizedHttpError);
  });

  it('throws a ForbiddenHttpError when an authenticated request has no access.', async(): Promise<void> => {
    input.credentials = { agent: { webId: 'http://test.com/#me' }};
    input.requestedModes = new IdentifierSetMultiMap<AccessMode>(
      [[ identifier, AccessMode.read ], [ identifier, AccessMode.write ]],
    );
    input.availablePermissions = new IdentifierMap([[ identifier, { read: true, write: false }]]);
    await expect(authorizer.handle(input)).rejects.toThrow(ForbiddenHttpError);
  });

  it('defaults to empty permissions for the Authorization.', async(): Promise<void> => {
    await expect(authorizer.handle(input)).resolves.toBeUndefined();
  });

  it('throws a ForbiddenHttpError if only some identifiers are authorized.', async(): Promise<void> => {
    const identifier2 = { path: 'http://example.com/no-access' };
    input.requestedModes = new IdentifierSetMultiMap<AccessMode>([
      [ identifier, AccessMode.read ],
      [ identifier, AccessMode.write ],
      [ identifier2, AccessMode.read ],
      [ identifier2, AccessMode.write ],
    ]);
    input.availablePermissions = new IdentifierMap([
      [ identifier, { read: true, write: true }],
      [ identifier2, { read: false, write: true }],
    ]);
    await expect(authorizer.handle(input)).rejects.toThrow(UnauthorizedHttpError);
  });

  it('throws a ForbiddenHttpError if identifiers have no PermissionMap entry.', async(): Promise<void> => {
    const identifier2 = { path: 'http://example.com/no-access' };
    input.requestedModes = new IdentifierSetMultiMap<AccessMode>([
      [ identifier, AccessMode.read ],
      [ identifier, AccessMode.write ],
      [ identifier2, AccessMode.read ],
      [ identifier2, AccessMode.write ],
    ]);
    input.availablePermissions = new IdentifierMap([
      [ identifier, { read: true, write: true }],
    ]);
    await expect(authorizer.handle(input)).rejects.toThrow(UnauthorizedHttpError);
  });
});
