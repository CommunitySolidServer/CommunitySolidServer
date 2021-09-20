import { CredentialGroup } from '../../../src/authentication/Credentials';
import type { AuthorizerInput } from '../../../src/authorization/Authorizer';
import { PermissionBasedAuthorizer } from '../../../src/authorization/PermissionBasedAuthorizer';
import type { PermissionReader } from '../../../src/authorization/PermissionReader';
import { WebAclAuthorization } from '../../../src/authorization/WebAclAuthorization';
import { AccessMode } from '../../../src/ldp/permissions/Permissions';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { UnauthorizedHttpError } from '../../../src/util/errors/UnauthorizedHttpError';

describe('A PermissionBasedAuthorizer', (): void => {
  let input: AuthorizerInput;
  let authorization: WebAclAuthorization;
  let reader: jest.Mocked<PermissionReader>;
  let authorizer: PermissionBasedAuthorizer;

  beforeEach(async(): Promise<void> => {
    input = {
      identifier: { path: 'http://test.com/foo' },
      modes: new Set<AccessMode>(),
      credentials: {},
    };

    authorization = new WebAclAuthorization({}, {});

    reader = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue({}),
    } as any;

    authorizer = new PermissionBasedAuthorizer(reader);
  });

  it('can handle any input supported by its reader.', async(): Promise<void> => {
    await expect(authorizer.canHandle(input)).resolves.toBeUndefined();

    reader.canHandle.mockRejectedValue(new Error('bad request'));
    await expect(authorizer.canHandle(input)).rejects.toThrow('bad request');
  });

  it('allows access if the permissions are matched by the reader output.', async(): Promise<void> => {
    input.modes = new Set([ AccessMode.read, AccessMode.write ]);
    reader.handle.mockResolvedValueOnce({
      [CredentialGroup.public]: { read: true, write: false },
      [CredentialGroup.agent]: { write: true },
    });
    Object.assign(authorization.everyone, { read: true, write: false });
    Object.assign(authorization.user, { write: true });
    await expect(authorizer.handle(input)).resolves.toEqual(authorization);
  });

  it('throws an UnauthorizedHttpError when an unauthenticated request has no access.', async(): Promise<void> => {
    input.modes = new Set([ AccessMode.read, AccessMode.write ]);
    reader.handle.mockResolvedValueOnce({
      [CredentialGroup.public]: { read: true, write: false },
    });
    await expect(authorizer.handle(input)).rejects.toThrow(UnauthorizedHttpError);
  });

  it('throws a ForbiddenHttpError when an authenticated request has no access.', async(): Promise<void> => {
    input.credentials = { agent: { webId: 'http://test.com/#me' }};
    input.modes = new Set([ AccessMode.read, AccessMode.write ]);
    reader.handle.mockResolvedValueOnce({
      [CredentialGroup.public]: { read: true, write: false },
    });
    await expect(authorizer.handle(input)).rejects.toThrow(ForbiddenHttpError);
  });

  it('defaults to empty permissions for the Authorization.', async(): Promise<void> => {
    await expect(authorizer.handle(input)).resolves.toEqual(authorization);
  });
});
