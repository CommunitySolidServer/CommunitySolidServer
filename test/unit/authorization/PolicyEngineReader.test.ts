import type { PolicyEngine } from '@solidlab/policy-engine';
import { PERMISSIONS } from '@solidlab/policy-engine';
import type { Credentials } from '../../../src/authentication/Credentials';
import type { AccessMap } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import { PolicyEngineReader } from '../../../src/authorization/PolicyEngineReader';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';

describe('A PolicyEngineReader', (): void => {
  const identifier = { path: 'http://example.com/foo' };
  const identifier2 = { path: 'http://example.com/bar' };
  const credentials: Credentials = {};
  let requestedModes: AccessMap;
  let engine: jest.Mocked<PolicyEngine>;
  let reader: PolicyEngineReader;

  beforeEach(async(): Promise<void> => {
    requestedModes = new IdentifierSetMultiMap();

    engine = {
      getPermissions: jest.fn(),
      getPermissionsWithReport: jest.fn(),
    };

    reader = new PolicyEngineReader(engine);
  });

  it('converts the returned permissions to access modes.', async(): Promise<void> => {
    requestedModes.add(identifier, AccessMode.write);
    requestedModes.add(identifier2, AccessMode.read);
    engine.getPermissions.mockResolvedValue({
      [PERMISSIONS.Modify]: true,
      [PERMISSIONS.Create]: false,
    });
    const result = await reader.handle({ credentials, requestedModes });
    expect(result.size).toBe(2);
    expect(result.get(identifier)).toEqual({
      [AccessMode.write]: true,
      [AccessMode.create]: false,
    });
    expect(result.get(identifier2)).toEqual({
      [AccessMode.write]: true,
      [AccessMode.create]: false,
    });
  });

  it('throws an error for unknown permissions.', async(): Promise<void> => {
    requestedModes.add(identifier, AccessMode.write);
    engine.getPermissions.mockResolvedValue({
      [PERMISSIONS.Modify]: true,
      unknown: false,
    });
    await expect(reader.handle({ credentials, requestedModes })).rejects.toThrow(InternalServerError);
  });

  it('throws an error for unknown access modes.', async(): Promise<void> => {
    requestedModes.add(identifier, 'unknown' as any);
    await expect(reader.handle({ credentials, requestedModes })).rejects.toThrow(InternalServerError);
  });
});
