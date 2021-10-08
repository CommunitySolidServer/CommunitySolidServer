import { CredentialGroup } from '../../../src/authentication/Credentials';
import { PathBasedReader } from '../../../src/authorization/PathBasedReader';
import type { PermissionReader, PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import type { PermissionSet } from '../../../src/authorization/permissions/Permissions';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

describe('A PathBasedReader', (): void => {
  const baseUrl = 'http://test.com/foo/';
  const permissionSet: PermissionSet = { [CredentialGroup.agent]: { read: true }};
  let input: PermissionReaderInput;
  let readers: jest.Mocked<PermissionReader>[];
  let reader: PathBasedReader;

  beforeEach(async(): Promise<void> => {
    input = {
      identifier: { path: `${baseUrl}first` },
      credentials: {},
    };

    readers = [
      { canHandle: jest.fn(), handle: jest.fn().mockResolvedValue(permissionSet) },
      { canHandle: jest.fn(), handle: jest.fn().mockResolvedValue(permissionSet) },
    ] as any;
    const paths = {
      '/first': readers[0],
      '/second': readers[1],
    };
    reader = new PathBasedReader(baseUrl, paths);
  });

  it('can only handle requests with a matching path.', async(): Promise<void> => {
    input.identifier.path = 'http://wrongsite/';
    await expect(reader.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
    input.identifier.path = `${baseUrl}third`;
    await expect(reader.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
    input.identifier.path = `${baseUrl}first`;
    await expect(reader.canHandle(input)).resolves.toBeUndefined();
    input.identifier.path = `${baseUrl}second`;
    await expect(reader.canHandle(input)).resolves.toBeUndefined();
  });

  it('can only handle requests supported by the stored readers.', async(): Promise<void> => {
    await expect(reader.canHandle(input)).resolves.toBeUndefined();
    readers[0].canHandle.mockRejectedValueOnce(new Error('not supported'));
    await expect(reader.canHandle(input)).rejects.toThrow('not supported');
  });

  it('passes the handle requests to the matching reader.', async(): Promise<void> => {
    await expect(reader.handle(input)).resolves.toBe(permissionSet);
    expect(readers[0].handle).toHaveBeenCalledTimes(1);
    expect(readers[0].handle).toHaveBeenLastCalledWith(input);
  });
});
