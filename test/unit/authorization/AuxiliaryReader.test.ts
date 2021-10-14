import { CredentialGroup } from '../../../src/authentication/Credentials';
import { AuxiliaryReader } from '../../../src/authorization/AuxiliaryReader';
import type { PermissionReader } from '../../../src/authorization/PermissionReader';
import type { PermissionSet } from '../../../src/authorization/permissions/Permissions';
import type { AuxiliaryStrategy } from '../../../src/http/auxiliary/AuxiliaryStrategy';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

describe('An AuxiliaryReader', (): void => {
  const suffix = '.dummy';
  const credentials = {};
  const subjectIdentifier = { path: 'http://test.com/foo' };
  const auxiliaryIdentifier = { path: 'http://test.com/foo.dummy' };
  const permissionSet: PermissionSet = { [CredentialGroup.agent]: { read: true }};
  let source: jest.Mocked<PermissionReader>;
  let strategy: jest.Mocked<AuxiliaryStrategy>;
  let reader: AuxiliaryReader;

  beforeEach(async(): Promise<void> => {
    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(permissionSet),
      handleSafe: jest.fn().mockResolvedValue(permissionSet),
    };

    strategy = {
      isAuxiliaryIdentifier: jest.fn((identifier: ResourceIdentifier): boolean => identifier.path.endsWith(suffix)),
      getSubjectIdentifier: jest.fn((identifier: ResourceIdentifier): ResourceIdentifier =>
        ({ path: identifier.path.slice(0, -suffix.length) })),
      usesOwnAuthorization: jest.fn().mockReturnValue(false),
    } as any;
    reader = new AuxiliaryReader(source, strategy);
  });

  it('can handle auxiliary resources if the source supports the subject resource.', async(): Promise<void> => {
    await expect(reader.canHandle({ identifier: auxiliaryIdentifier, credentials }))
      .resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenLastCalledWith(
      { identifier: subjectIdentifier, credentials },
    );
    await expect(reader.canHandle({ identifier: subjectIdentifier, credentials }))
      .rejects.toThrow(NotImplementedHttpError);

    strategy.usesOwnAuthorization.mockReturnValueOnce(true);
    await expect(reader.canHandle({ identifier: auxiliaryIdentifier, credentials }))
      .rejects.toThrow(NotImplementedHttpError);

    source.canHandle.mockRejectedValue(new Error('no source support'));
    await expect(reader.canHandle({ identifier: auxiliaryIdentifier, credentials }))
      .rejects.toThrow('no source support');
  });

  it('handles resources by sending the updated parameters to the source.', async(): Promise<void> => {
    await expect(reader.handle({ identifier: auxiliaryIdentifier, credentials }))
      .resolves.toBe(permissionSet);
    expect(source.handle).toHaveBeenLastCalledWith(
      { identifier: subjectIdentifier, credentials },
    );
    // Safety checks are not present when calling `handle`
    await expect(reader.handle({ identifier: subjectIdentifier, credentials }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('combines both checking and handling when calling handleSafe.', async(): Promise<void> => {
    await expect(reader.handleSafe({ identifier: auxiliaryIdentifier, credentials }))
      .resolves.toBe(permissionSet);
    expect(source.handleSafe).toHaveBeenLastCalledWith(
      { identifier: subjectIdentifier, credentials },
    );

    await expect(reader.handleSafe({ identifier: subjectIdentifier, credentials }))
      .rejects.toThrow(NotImplementedHttpError);

    strategy.usesOwnAuthorization.mockReturnValueOnce(true);
    await expect(reader.canHandle({ identifier: auxiliaryIdentifier, credentials }))
      .rejects.toThrow(NotImplementedHttpError);

    source.handleSafe.mockRejectedValue(new Error('no source support'));
    await expect(reader.handleSafe({ identifier: auxiliaryIdentifier, credentials }))
      .rejects.toThrow('no source support');
  });
});
