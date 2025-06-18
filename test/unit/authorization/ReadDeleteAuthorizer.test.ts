import { PERMISSIONS } from '@solidlab/policy-engine';
import type { Credentials } from '../../../src/authentication/Credentials';
import type { Authorizer, AuthorizerInput } from '../../../src/authorization/Authorizer';
import type { AccessMap, MultiPermissionMap } from '../../../src/authorization/permissions/Permissions';
import { ReadDeleteAuthorizer } from '../../../src/authorization/ReadDeleteAuthorizer';
import type { ResourceSet } from '../../../src/storage/ResourceSet';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../../../src/util/identifiers/IdentifierStrategy';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';

describe('A ReadDeleteAuthorizer', (): void => {
  const baseUrl = 'http://example.com/';
  const resource = 'http://example.com/foo';
  const credentials: Credentials = {};
  let requestedModes: AccessMap;
  let availablePermissions: MultiPermissionMap;
  let input: AuthorizerInput;
  let resourceSet: jest.Mocked<ResourceSet>;
  let identifierStrategy: jest.Mocked<IdentifierStrategy>;
  let source: jest.Mocked<Authorizer>;
  let authorizer: ReadDeleteAuthorizer;

  beforeEach(async(): Promise<void> => {
    requestedModes = new IdentifierSetMultiMap();
    availablePermissions = new IdentifierMap();

    resourceSet = {
      hasResource: jest.fn().mockResolvedValue(true),
    };

    identifierStrategy = {
      isRootContainer: jest.fn().mockReturnValue(false),
      getParentContainer: jest.fn().mockReturnValue({ path: baseUrl }),
    } as any;

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockRejectedValue(new InternalServerError('source')),
      handleSafe: jest.fn(),
    };

    input = { requestedModes, availablePermissions, credentials };

    authorizer = new ReadDeleteAuthorizer(source, resourceSet, identifierStrategy);
  });

  it('supports input its source supports.', async(): Promise<void> => {
    await expect(authorizer.canHandle(input)).resolves.toBeUndefined();

    source.canHandle.mockRejectedValue(new Error('bad data'));
    await expect(authorizer.canHandle(input)).rejects.toThrow('bad data');
  });

  it('throws a 404 when trying to delete a non-existent readable resource.', async(): Promise<void> => {
    requestedModes.add({ path: resource }, PERMISSIONS.Delete);
    availablePermissions.set({ path: resource }, { [PERMISSIONS.Read]: true });
    resourceSet.hasResource.mockResolvedValue(false);

    await expect(authorizer.handle(input)).rejects.toThrow(NotFoundHttpError);
  });

  it('throws a 404 when trying to delete a non-existent resource with readable parent.', async(): Promise<void> => {
    requestedModes.add({ path: resource }, PERMISSIONS.Delete);
    availablePermissions.set({ path: baseUrl }, { [PERMISSIONS.Read]: true });
    resourceSet.hasResource.mockResolvedValue(false);

    await expect(authorizer.handle(input)).rejects.toThrow(NotFoundHttpError);
  });

  it('calls the source when trying to delete a non-existent resource with no read access.', async(): Promise<void> => {
    requestedModes.add({ path: resource }, PERMISSIONS.Delete);
    resourceSet.hasResource.mockResolvedValue(false);

    await expect(authorizer.handle(input)).rejects.toThrow(InternalServerError);
  });

  it('removes the delete permission if the resource does not exist.', async(): Promise<void> => {
    requestedModes.add({ path: resource }, PERMISSIONS.Delete);
    availablePermissions.set({ path: resource }, { [PERMISSIONS.Delete]: true });
    resourceSet.hasResource.mockResolvedValue(false);

    await expect(authorizer.handle(input)).rejects.toThrow(InternalServerError);
    expect(source.handle.mock.calls[0][0].availablePermissions.get({ path: resource })?.[PERMISSIONS.Delete])
      .toBe(false);
  });

  it('does not change non-delete requests.', async(): Promise<void> => {
    requestedModes.add({ path: resource }, PERMISSIONS.Read);

    await expect(authorizer.handle(input)).rejects.toThrow(InternalServerError);
    expect(source.handle.mock.calls[0][0].requestedModes.get({ path: resource })?.has(PERMISSIONS.Read)).toBe(true);
  });
});
