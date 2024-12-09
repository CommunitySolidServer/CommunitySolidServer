import type { PermissionMap } from '@solidlab/policy-engine';
import { PERMISSIONS } from '@solidlab/policy-engine';
import { PathBasedReader } from '../../../src/authorization/PathBasedReader';
import type { PermissionReader, PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import type { MultiPermissionMap } from '../../../src/authorization/permissions/Permissions';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { map } from '../../../src/util/IterableUtil';
import { IdentifierMap, IdentifierSetMultiMap } from '../../../src/util/map/IdentifierMap';
import { joinUrl } from '../../../src/util/PathUtil';
import { compareMaps } from '../../util/Util';

describe('A PathBasedReader', (): void => {
  const baseUrl = 'http://test.com/foo/';
  const permissionSet: PermissionMap = { [PERMISSIONS.Read]: true };
  let readers: jest.Mocked<PermissionReader>[];
  let reader: PathBasedReader;

  function handleSafe({ requestedModes }: PermissionReaderInput): MultiPermissionMap {
    return new IdentifierMap(map(requestedModes.distinctKeys(), (identifier): [ResourceIdentifier, PermissionMap] =>
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
      requestedModes: new IdentifierSetMultiMap<string>([
        [{ path: joinUrl(baseUrl, 'first') }, PERMISSIONS.Read ],
        [{ path: joinUrl(baseUrl, 'second') }, PERMISSIONS.Read ],
        [{ path: joinUrl(baseUrl, 'nothere') }, PERMISSIONS.Read ],
        [{ path: 'http://wrongsite' }, PERMISSIONS.Read ],
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
      new IdentifierSetMultiMap([[{ path: joinUrl(baseUrl, 'first') }, PERMISSIONS.Read ]]),
    );

    expect(readers[1].handleSafe).toHaveBeenCalledTimes(1);
    expect(readers[1].handleSafe.mock.calls[0][0].credentials).toEqual({});
    compareMaps(
      readers[1].handleSafe.mock.calls[0][0].requestedModes,
      new IdentifierSetMultiMap([[{ path: joinUrl(baseUrl, 'second') }, PERMISSIONS.Read ]]),
    );
  });
});
