import type { Authorizer } from '../../../src/authorization/Authorizer';
import { AuxiliaryAuthorizer } from '../../../src/authorization/AuxiliaryAuthorizer';
import type { AuxiliaryIdentifierStrategy } from '../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import type { PermissionSet } from '../../../src/ldp/permissions/PermissionSet';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

describe('An AuxiliaryAuthorizer', (): void => {
  const suffix = '.dummy';
  const credentials = {};
  const associatedIdentifier = { path: 'http://test.com/foo' };
  const auxiliaryIdentifier = { path: 'http://test.com/foo.dummy' };
  let permissions: PermissionSet;
  let source: Authorizer;
  let strategy: AuxiliaryIdentifierStrategy;
  let authorizer: AuxiliaryAuthorizer;

  beforeEach(async(): Promise<void> => {
    permissions = {
      read: true,
      write: true,
      append: true,
      control: false,
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      handleSafe: jest.fn(),
    };

    strategy = {
      isAuxiliaryIdentifier: jest.fn((identifier: ResourceIdentifier): boolean => identifier.path.endsWith(suffix)),
      getAssociatedIdentifier: jest.fn((identifier: ResourceIdentifier): ResourceIdentifier =>
        ({ path: identifier.path.slice(0, -suffix.length) })),
    } as any;
    authorizer = new AuxiliaryAuthorizer(source, strategy);
  });

  it('can handle auxiliary resources if the source supports the associated resource.', async(): Promise<void> => {
    await expect(authorizer.canHandle({ identifier: auxiliaryIdentifier, credentials, permissions }))
      .resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenLastCalledWith(
      { identifier: associatedIdentifier, credentials, permissions },
    );
    await expect(authorizer.canHandle({ identifier: associatedIdentifier, credentials, permissions }))
      .rejects.toThrow(NotImplementedHttpError);
    source.canHandle = jest.fn().mockRejectedValue(new Error('no source support'));
    await expect(authorizer.canHandle({ identifier: auxiliaryIdentifier, credentials, permissions }))
      .rejects.toThrow('no source support');
  });

  it('handles resources by sending the updated parameters to the source.', async(): Promise<void> => {
    await expect(authorizer.handle({ identifier: auxiliaryIdentifier, credentials, permissions }))
      .resolves.toBeUndefined();
    expect(source.handle).toHaveBeenLastCalledWith(
      { identifier: associatedIdentifier, credentials, permissions },
    );
    // Safety checks are not present when calling `handle`
    await expect(authorizer.handle({ identifier: associatedIdentifier, credentials, permissions }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('combines both checking and handling when calling handleSafe.', async(): Promise<void> => {
    await expect(authorizer.handleSafe({ identifier: auxiliaryIdentifier, credentials, permissions }))
      .resolves.toBeUndefined();
    expect(source.handleSafe).toHaveBeenLastCalledWith(
      { identifier: associatedIdentifier, credentials, permissions },
    );
    await expect(authorizer.handleSafe({ identifier: associatedIdentifier, credentials, permissions }))
      .rejects.toThrow(NotImplementedHttpError);
    source.handleSafe = jest.fn().mockRejectedValue(new Error('no source support'));
    await expect(authorizer.handleSafe({ identifier: auxiliaryIdentifier, credentials, permissions }))
      .rejects.toThrow('no source support');
  });
});
