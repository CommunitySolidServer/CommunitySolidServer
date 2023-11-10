import { PathBasedReader } from '../../../src/authorization/PathBasedReader';
import type { PermissionReader, PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import type { PermissionMap, PermissionSet } from '../../../src/authorization/permissions/Permissions';
import { AccessMode } from '../../../src/authorization/permissions/Permissions';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { map } from '../../../src/util/IterableUtil';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { joinUrl } from '../../../src/util/PathUtil';
import { compareMaps } from '../../util/Util';

describe('A PathBasedReader', (): void => {
  const baseUrl = 'http://test.com/foo/';
  const permissionSet: PermissionSet = { read: true };
  let readers: jest.Mocked<PermissionReader>[];
  let reader: PathBasedReader;

  function handleSafe({ requestedModes }: PermissionReaderInput): PermissionMap {
    return new IdentifierMap(map(requestedModes.distinctKeys(), (identifier): [ResourceIdentifier, PermissionSet] =>
      [ identifier, permissionSet ]));
  }

  beforeEach(async(): Promise<void> => {
    readers = [
      { canHandle: jest.fn(), handleSafe: jest.fn(handleSafe) },
      { canHandle: jest.fn(), handleSafe: jest.fn(handleSafe) },
    ] as any;
    const paths = {
      '/first': readers[0],
      '/second': readers[1],
    };
    reader = new PathBasedReader(baseUrl, paths);
  });

  it('passes the handle requests to the matching reader.', async(): Promise<void> => {
    const input: PermissionReaderInput = {
      credentials: {},
      requestedModes: new IdentifierSetMultiMap<AccessMode>([
        [{ path: joinUrl(baseUrl, 'first') }, AccessMode.read ],
        [{ path: joinUrl(baseUrl, 'second') }, AccessMode.read ],
        [{ path: joinUrl(baseUrl, 'nothere') }, AccessMode.read ],
        [{ path: 'http://wrongsite' }, AccessMode.read ],
      ]),
    };

    const result = new IdentifierMap([
      [{ path: joinUrl(baseUrl, 'first') }, permissionSet ],
      [{ path: joinUrl(baseUrl, 'second') }, permissionSet ],
    ]);

    await expect(reader.handle(input)).resolves.toEqual(result);
    expect(readers[0].handleSafe).toHaveBeenCalledTimes(1);
    expect(readers[0].handleSafe.mock.calls[0][0].credentials).toEqual({});
    compareMaps(
      readers[0].handleSafe.mock.calls[0][0].requestedModes,
      new IdentifierSetMultiMap([[{ path: joinUrl(baseUrl, 'first') }, AccessMode.read ]]),
    );

    expect(readers[1].handleSafe).toHaveBeenCalledTimes(1);
    expect(readers[1].handleSafe.mock.calls[0][0].credentials).toEqual({});
    compareMaps(
      readers[1].handleSafe.mock.calls[0][0].requestedModes,
      new IdentifierSetMultiMap([[{ path: joinUrl(baseUrl, 'second') }, AccessMode.read ]]),
    );
  });
});
