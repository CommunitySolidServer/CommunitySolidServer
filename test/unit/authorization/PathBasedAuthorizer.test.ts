import type { Authorizer, AuthorizerInput } from '../../../src/authorization/Authorizer';
import { PathBasedAuthorizer } from '../../../src/authorization/PathBasedAuthorizer';
import { AccessMode } from '../../../src/ldp/permissions/PermissionSet';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

describe('A PathBasedAuthorizer', (): void => {
  const baseUrl = 'http://test.com/foo/';
  let input: AuthorizerInput;
  let authorizers: jest.Mocked<Authorizer>[];
  let authorizer: PathBasedAuthorizer;

  beforeEach(async(): Promise<void> => {
    input = {
      identifier: { path: `${baseUrl}first` },
      modes: new Set([ AccessMode.read ]),
      credentials: {},
    };

    authorizers = [
      { canHandle: jest.fn(), handle: jest.fn() },
      { canHandle: jest.fn(), handle: jest.fn() },
    ] as any;
    const paths = {
      '/first': authorizers[0],
      '/second': authorizers[1],
    };
    authorizer = new PathBasedAuthorizer(baseUrl, paths);
  });

  it('can only handle requests with a matching path.', async(): Promise<void> => {
    input.identifier.path = 'http://wrongsite/';
    await expect(authorizer.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
    input.identifier.path = `${baseUrl}third`;
    await expect(authorizer.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
    input.identifier.path = `${baseUrl}first`;
    await expect(authorizer.canHandle(input)).resolves.toBeUndefined();
    input.identifier.path = `${baseUrl}second`;
    await expect(authorizer.canHandle(input)).resolves.toBeUndefined();
  });

  it('can only handle requests supported by the stored authorizers.', async(): Promise<void> => {
    await expect(authorizer.canHandle(input)).resolves.toBeUndefined();
    authorizers[0].canHandle.mockRejectedValueOnce(new Error('not supported'));
    await expect(authorizer.canHandle(input)).rejects.toThrow('not supported');
  });

  it('passes the handle requests to the matching authorizer.', async(): Promise<void> => {
    await expect(authorizer.handle(input)).resolves.toBeUndefined();
    expect(authorizers[0].handle).toHaveBeenCalledTimes(1);
    expect(authorizers[0].handle).toHaveBeenLastCalledWith(input);
  });
});
