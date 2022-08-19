import type { PermissionReader, PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import type { PermissionSet } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import { UnionPermissionReader } from '../../../src/authorization/UnionPermissionReader';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { compareMaps } from '../../util/Util';

describe('A UnionPermissionReader', (): void => {
  const identifier = { path: 'http://example.com/foo' };
  const input: PermissionReaderInput = { credentials: {},
    requestedModes: new IdentifierSetMultiMap<AccessMode>([[ identifier, AccessMode.read ]]) };
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
      new IdentifierMap([[ identifier, { agent: { read: true }}]]),
    );
    readers[1].handle.mockResolvedValue(
      new IdentifierMap([[ identifier, { agent: { write: true }}]]),
    );
    compareMaps(await unionReader.handle(input),
      new IdentifierMap([[ identifier, { agent: { write: true }}]]));
  });

  it('combines results.', async(): Promise<void> => {
    const identifier2 = { path: 'http://example.com/foo2' };
    const identifier3 = { path: 'http://example.com/foo3' };
    readers[0].handle.mockResolvedValue(new IdentifierMap([
      [ identifier, { agent: { read: true }, public: undefined }],
      [ identifier2, { agent: { write: true }}],
      [ identifier3, { agent: { append: false }, public: { delete: true }}],
    ]));
    readers[1].handle.mockResolvedValue(new IdentifierMap<PermissionSet>([
      [ identifier, { agent: { write: true }, public: { read: false }}],
      [ identifier2, { public: { read: false }}],
    ]));
    compareMaps(await unionReader.handle(input), new IdentifierMap([
      [ identifier, { agent: { read: true, write: true }, public: { read: false }}],
      [ identifier2, { agent: { write: true }, public: { read: false }}],
      [ identifier3, { agent: { append: false }, public: { delete: true }}],
    ]));
  });

  it('merges same fields using false > true > undefined.', async(): Promise<void> => {
    readers[0].handle.mockResolvedValue(new IdentifierMap(
      [[ identifier,
        { agent: { read: true, write: false, append: undefined, create: true, delete: undefined }}]],
    ));
    readers[1].handle.mockResolvedValue(new IdentifierMap(
      [[ identifier, { agent:
          { read: false, write: true, append: true, create: true, delete: undefined }}]],
    ));
    compareMaps(await unionReader.handle(input), new IdentifierMap([[ identifier, {
      agent: { read: false, write: false, append: true, create: true },
    }]]));
  });
});
