import type { PermissionReader, PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import type { PermissionSetWithComparisons } from '../../../src/authorization/permissions/ComparisonPermissions';
import { COMPARISON_PERMISSIONS, getComparisonPermissions } from
  '../../../src/authorization/permissions/ComparisonPermissions';
import type { PermissionSet } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import { UnionPermissionReader } from '../../../src/authorization/UnionPermissionReader';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../util/Util';

describe('A UnionPermissionReader', (): void => {
  const identifier = { path: 'http://example.com/foo' };
  const input: PermissionReaderInput = {
    credentials: {},
    requestedModes: new IdentifierSetMultiMap<AccessMode>([[ identifier, AccessMode.read ]]),
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
      new IdentifierMap([[ identifier, { read: true }]]),
    );
    readers[1].handle.mockResolvedValue(
      new IdentifierMap([[ identifier, { write: true }]]),
    );
    compareMaps(await unionReader.handle(input), new IdentifierMap([[ identifier, { write: true }]]));
  });

  it('combines results.', async(): Promise<void> => {
    const identifier2 = { path: 'http://example.com/foo2' };
    const identifier3 = { path: 'http://example.com/foo3' };
    readers[0].handle.mockResolvedValue(new IdentifierMap([
      [ identifier, { read: true }],
      [ identifier2, { write: true }],
      [ identifier3, { append: false }],
    ]));
    readers[1].handle.mockResolvedValue(new IdentifierMap<PermissionSet>([
      [ identifier, { write: true }],
    ]));
    compareMaps(await unionReader.handle(input), new IdentifierMap([
      [ identifier, { read: true, write: true }],
      [ identifier2, { write: true }],
      [ identifier3, { append: false }],
    ]));
  });

  it('merges same fields using false > true > undefined.', async(): Promise<void> => {
    readers[0].handle.mockResolvedValue(new IdentifierMap(
      [[ identifier, { read: true, write: false, append: undefined, create: true, delete: undefined }]],
    ));
    readers[1].handle.mockResolvedValue(new IdentifierMap(
      [[ identifier, { read: false, write: true, append: true, create: true, delete: undefined }]],
    ));
    compareMaps(await unionReader.handle(input), new IdentifierMap(
      [[ identifier, { read: false, write: false, append: true, create: true }]],
    ));
  });

  it('merges comparison permissions (the COMPARISON_PERMISSIONS symbol) across readers.', async(): Promise<void> => {
    const set0: PermissionSetWithComparisons = { read: true };
    set0[COMPARISON_PERMISSIONS] = [{ read: true, write: false }];
    const set1: PermissionSetWithComparisons = { write: true };
    set1[COMPARISON_PERMISSIONS] = [{ read: false, write: true, append: true }];
    readers[0].handle.mockResolvedValue(new IdentifierMap([[ identifier, set0 ]]));
    readers[1].handle.mockResolvedValue(new IdentifierMap([[ identifier, set1 ]]));

    const result = await unionReader.handle(input);
    // Primary merges as usual.
    expect(result.get(identifier)).toMatchObject({ read: true, write: true });
    // Comparison entry merges position 0 with the same false > true > undefined rule.
    const comparisons = getComparisonPermissions(result.get(identifier));
    expect(comparisons).toHaveLength(1);
    expect(comparisons![0]).toEqual({ read: false, write: false, append: true });
  });

  it('does not mutate a source reader comparison set while merging.', async(): Promise<void> => {
    const set0: PermissionSetWithComparisons = { read: true };
    const source0 = { read: true };
    set0[COMPARISON_PERMISSIONS] = [ source0 ];
    readers[0].handle.mockResolvedValue(new IdentifierMap([[ identifier, set0 ]]));
    readers[1].handle.mockResolvedValue(new IdentifierMap());

    const result = await unionReader.handle(input);
    getComparisonPermissions(result.get(identifier))![0].write = true;
    // The original reader's comparison object must be untouched.
    expect(source0).toEqual({ read: true });
  });
});
