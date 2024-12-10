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
  let input: PermissionReaderInput;
  let readers: jest.Mocked<PermissionReader>[];
  let reader: PathBasedReader;

  function createHandle(output: PermissionMap): (input: PermissionReaderInput) => MultiPermissionMap {
    return (input): MultiPermissionMap =>
      new IdentifierMap(map(input.requestedModes.distinctKeys(), (identifier): [ResourceIdentifier, PermissionMap] =>
        [ identifier, output ]));
  }

  beforeEach(async(): Promise<void> => {
    input = {
      credentials: {},
      requestedModes: new IdentifierSetMultiMap<string>([
        [{ path: joinUrl(baseUrl, 'first') }, PERMISSIONS.Read ],
        [{ path: joinUrl(baseUrl, 'second') }, PERMISSIONS.Read ],
        [{ path: joinUrl(baseUrl, 'nothere') }, PERMISSIONS.Read ],
        [{ path: 'http://wrongsite' }, PERMISSIONS.Read ],
      ]),
    };

    readers = [
      { canHandle: jest.fn(), handle: jest.fn(createHandle({ one: true })) },
      { canHandle: jest.fn(), handle: jest.fn(createHandle({ two: true })) },
    ] as any;
    const paths = {
      '/first': readers[0],
      '/second': readers[1],
    };
    reader = new PathBasedReader(baseUrl, paths);
  });

  it('can handle input its readers can handle.', async(): Promise<void> => {
    await expect(reader.canHandle(input)).resolves.toBeUndefined();
    expect(readers[0].canHandle).toHaveBeenCalledTimes(1);
    expect(readers[1].canHandle).toHaveBeenCalledTimes(1);
  });

  it('passes the handle requests to the matching reader.', async(): Promise<void> => {
    compareMaps(
      await reader.handle(input),
      new IdentifierMap<PermissionMap>([
        [{ path: joinUrl(baseUrl, 'first') }, { one: true }],
        [{ path: joinUrl(baseUrl, 'second') }, { two: true }],
      ]),
    );
    expect(readers[0].handle).toHaveBeenCalledTimes(1);
    expect(readers[0].handle.mock.calls[0][0].credentials).toEqual({});
    compareMaps(
      readers[0].handle.mock.calls[0][0].requestedModes,
      new IdentifierSetMultiMap([[{ path: joinUrl(baseUrl, 'first') }, PERMISSIONS.Read ]]),
    );

    expect(readers[1].handle).toHaveBeenCalledTimes(1);
    expect(readers[1].handle.mock.calls[0][0].credentials).toEqual({});
    compareMaps(
      readers[1].handle.mock.calls[0][0].requestedModes,
      new IdentifierSetMultiMap([[{ path: joinUrl(baseUrl, 'second') }, PERMISSIONS.Read ]]),
    );
  });

  it('calls the defaultReader for unmatched paths if there is one.', async(): Promise<void> => {
    const defaultReader: jest.Mocked<PermissionReader> = {
      handle: jest.fn(createHandle({ default: true })),
    } as any;
    reader = new PathBasedReader(baseUrl, {
      '/first': readers[0],
      '/second': readers[1],
    }, defaultReader);

    compareMaps(
      await reader.handle(input),
      new IdentifierMap<PermissionMap>([
        [{ path: joinUrl(baseUrl, 'first') }, { one: true }],
        [{ path: joinUrl(baseUrl, 'second') }, { two: true }],
        [{ path: joinUrl(baseUrl, 'nothere') }, { default: true }],
        [{ path: 'http://wrongsite' }, { default: true }],
      ]),
    );
  });
});
