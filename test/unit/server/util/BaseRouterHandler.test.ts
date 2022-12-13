import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { BaseRouterHandlerArgs } from '../../../../src/server/util/BaseRouterHandler';
import { BaseRouterHandler } from '../../../../src/server/util/BaseRouterHandler';
import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';

class SimpleRouterHandler extends BaseRouterHandler<AsyncHandler<{ method: string; target: ResourceIdentifier }>> {
  public constructor(args: BaseRouterHandlerArgs<AsyncHandler<{ method: string; target: ResourceIdentifier }>>) {
    super(args);
  }

  public async canHandle(input: { method: string; target: ResourceIdentifier }): Promise<void> {
    await this.canHandleInput(input, input.method, input.target);
  }
}

describe('A BaseRouterHandler', (): void => {
  const baseUrl = 'http://example.com/';
  const method = 'GET';
  const target: ResourceIdentifier = { path: 'http://example.com/foo' };
  let handler: jest.Mocked<AsyncHandler<{ method: string; target: ResourceIdentifier }>>;
  let router: SimpleRouterHandler;

  beforeEach(async(): Promise<void> => {
    handler = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue('result'),
    } as any;

    router = new SimpleRouterHandler({
      baseUrl,
      handler,
      allowedPathNames: [ '^/foo$', '^/bar$' ],
      allowedMethods: [ 'GET', 'HEAD' ],
    });
  });

  it('requires the correct method.', async(): Promise<void> => {
    await expect(router.canHandle({ method: 'POST', target })).rejects.toThrow('POST is not allowed');
  });

  it('requires the path to match a given regex.', async(): Promise<void> => {
    await expect(router.canHandle({ method, target: { path: 'http://example.com/baz' }}))
      .rejects.toThrow('Cannot handle route /baz');
  });

  it('accepts valid input.', async(): Promise<void> => {
    await expect(router.canHandle({ method, target })).resolves.toBeUndefined();
  });

  it('requires the source handler to accept the input.', async(): Promise<void> => {
    handler.canHandle.mockRejectedValue(new Error('bad input'));
    await expect(router.canHandle({ method, target })).rejects.toThrow('bad input');
  });

  it('accepts all methods if no restrictions are defined.', async(): Promise<void> => {
    router = new SimpleRouterHandler({
      baseUrl,
      handler,
      allowedPathNames: [ '^/foo$', '^/bar$' ],
    });
    await expect(router.canHandle({ method: 'POST', target })).resolves.toBeUndefined();
  });

  it('accepts all paths if no restrictions are defined.', async(): Promise<void> => {
    router = new SimpleRouterHandler({
      handler,
      allowedMethods: [ 'GET', 'HEAD' ],
    });
    await expect(router.canHandle({ method, target: { path: 'http://example.com/baz' }})).resolves.toBeUndefined();
  });

  it('requires a baseUrl input if there is a path restriction.', async(): Promise<void> => {
    expect((): any => new SimpleRouterHandler({
      handler,
      allowedPathNames: [ '^/foo$', '^/bar$' ],
    })).toThrow('A value for allowedPathNames requires baseUrl to be defined.');
  });

  it('calls the source handler.', async(): Promise<void> => {
    await expect(router.handle({ method, target })).resolves.toBe('result');
    expect(handler.handle).toHaveBeenCalledTimes(1);
    expect(handler.handle).toHaveBeenLastCalledWith({ method, target });
  });
});
