import type { Authorizer } from '../../../src/authorization/Authorizer';
import { AuxiliaryAuthorizer } from '../../../src/authorization/AuxiliaryAuthorizer';
import type { AuxiliaryIdentifierStrategy } from '../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import { AccessMode } from '../../../src/ldp/permissions/PermissionSet';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

describe('An AuxiliaryAuthorizer', (): void => {
  const suffix = '.dummy';
  const credentials = {};
  const associatedIdentifier = { path: 'http://test.com/foo' };
  const auxiliaryIdentifier = { path: 'http://test.com/foo.dummy' };
  let modes: Set<AccessMode>;
  let source: Authorizer;
  let strategy: AuxiliaryIdentifierStrategy;
  let authorizer: AuxiliaryAuthorizer;

  beforeEach(async(): Promise<void> => {
    modes = new Set([ AccessMode.read, AccessMode.write, AccessMode.append ]);

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
    await expect(authorizer.canHandle({ identifier: auxiliaryIdentifier, credentials, modes }))
      .resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenLastCalledWith(
      { identifier: associatedIdentifier, credentials, modes },
    );
    await expect(authorizer.canHandle({ identifier: associatedIdentifier, credentials, modes }))
      .rejects.toThrow(NotImplementedHttpError);
    source.canHandle = jest.fn().mockRejectedValue(new Error('no source support'));
    await expect(authorizer.canHandle({ identifier: auxiliaryIdentifier, credentials, modes }))
      .rejects.toThrow('no source support');
  });

  it('handles resources by sending the updated parameters to the source.', async(): Promise<void> => {
    await expect(authorizer.handle({ identifier: auxiliaryIdentifier, credentials, modes }))
      .resolves.toBeUndefined();
    expect(source.handle).toHaveBeenLastCalledWith(
      { identifier: associatedIdentifier, credentials, modes },
    );
    // Safety checks are not present when calling `handle`
    await expect(authorizer.handle({ identifier: associatedIdentifier, credentials, modes }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('combines both checking and handling when calling handleSafe.', async(): Promise<void> => {
    await expect(authorizer.handleSafe({ identifier: auxiliaryIdentifier, credentials, modes }))
      .resolves.toBeUndefined();
    expect(source.handleSafe).toHaveBeenLastCalledWith(
      { identifier: associatedIdentifier, credentials, modes },
    );
    await expect(authorizer.handleSafe({ identifier: associatedIdentifier, credentials, modes }))
      .rejects.toThrow(NotImplementedHttpError);
    source.handleSafe = jest.fn().mockRejectedValue(new Error('no source support'));
    await expect(authorizer.handleSafe({ identifier: auxiliaryIdentifier, credentials, modes }))
      .rejects.toThrow('no source support');
  });
});
