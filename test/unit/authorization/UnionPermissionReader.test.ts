import type { PermissionMap } from '@solidlab/policy-engine';
import { PERMISSIONS } from '@solidlab/policy-engine';
import type { PermissionReader, PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import { UnionPermissionReader } from '../../../src/authorization/UnionPermissionReader';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../util/Util';

describe('A UnionPermissionReader', (): void => {
  const identifier = { path: 'http://example.com/foo' };
  const input: PermissionReaderInput = {
    credentials: {},
    requestedModes: new IdentifierSetMultiMap<string>([[ identifier, PERMISSIONS.Read ]]),
  };
  let readers: jest.Mocked<PermissionReader>[];
  let unionReader: UnionPermissionReader;

  beforeEach(async(): Promise<void> => {
    readers = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue(new IdentifierMap()),
      } as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue(new IdentifierMap()),
      } as any,
    ];

    unionReader = new UnionPermissionReader(readers);
  });

  it('only uses the results of readers that can handle the input.', async(): Promise<void> => {
    readers[0].canHandle.mockRejectedValue(new Error('bad request'));
    readers[0].handle.mockResolvedValue(
      new IdentifierMap([[ identifier, { [PERMISSIONS.Read]: true }]]),
    );
    readers[1].handle.mockResolvedValue(
      new IdentifierMap([[ identifier, { [PERMISSIONS.Modify]: true }]]),
    );
    compareMaps(await unionReader.handle(input), new IdentifierMap([[ identifier, { [PERMISSIONS.Modify]: true }]]));
  });

  it('combines results.', async(): Promise<void> => {
    const identifier2 = { path: 'http://example.com/foo2' };
    const identifier3 = { path: 'http://example.com/foo3' };
    readers[0].handle.mockResolvedValue(new IdentifierMap<PermissionMap>([
      [ identifier, { [PERMISSIONS.Read]: true }],
      [ identifier2, { [PERMISSIONS.Modify]: true }],
      [ identifier3, { [PERMISSIONS.Append]: false }],
    ]));
    readers[1].handle.mockResolvedValue(new IdentifierMap<PermissionMap>([
      [ identifier, { [PERMISSIONS.Modify]: true }],
    ]));
    compareMaps(await unionReader.handle(input), new IdentifierMap<PermissionMap>([
      [ identifier, { [PERMISSIONS.Read]: true, [PERMISSIONS.Modify]: true }],
      [ identifier2, { [PERMISSIONS.Modify]: true }],
      [ identifier3, { [PERMISSIONS.Append]: false }],
    ]));
  });

  it('merges same fields using false > true > undefined.', async(): Promise<void> => {
    readers[0].handle.mockResolvedValue(new IdentifierMap(
      [[ identifier, {
        [PERMISSIONS.Read]: true,
        [PERMISSIONS.Modify]: false,
        [PERMISSIONS.Create]: true,
      }]],
    ));
    readers[1].handle.mockResolvedValue(new IdentifierMap(
      [[ identifier, {
        [PERMISSIONS.Read]: false,
        [PERMISSIONS.Modify]: true,
        [PERMISSIONS.Append]: true,
        [PERMISSIONS.Create]: true,
      }]],
    ));
    compareMaps(await unionReader.handle(input), new IdentifierMap(
      [[ identifier, {
        [PERMISSIONS.Read]: false,
        [PERMISSIONS.Modify]: false,
        [PERMISSIONS.Append]: true,
        [PERMISSIONS.Create]: true,
      }]],
    ));
  });
});
