import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';
import {
  MethodFilterHandler,
} from '../../../../src/util/handlers/MethodFilterHandler';

describe('A MethodFilterHandler', (): void => {
  const modes = [ 'PATCH', 'POST' ];
  const result = 'RESULT';
  let operation: Operation;
  let source: jest.Mocked<AsyncHandler<Operation, string>>;
  let handler: MethodFilterHandler<any, string>;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'PATCH',
      preferences: {},
      target: { path: 'http://example.com/foo' },
      body: new BasicRepresentation(),
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(result),
    } as any;

    handler = new MethodFilterHandler(modes, source);
  });

  it('rejects unknown methods.', async(): Promise<void> => {
    operation.method = 'GET';
    await expect(handler.canHandle(operation)).rejects.toThrow(NotImplementedHttpError);
  });

  it('checks if the source handle supports the request.', async(): Promise<void> => {
    operation.method = 'PATCH';
    await expect(handler.canHandle(operation)).resolves.toBeUndefined();
    operation.method = 'POST';
    await expect(handler.canHandle(operation)).resolves.toBeUndefined();
    source.canHandle.mockRejectedValueOnce(new Error('not supported'));
    await expect(handler.canHandle(operation)).rejects.toThrow('not supported');
    expect(source.canHandle).toHaveBeenLastCalledWith(operation);
  });

  it('supports multiple object formats.', async(): Promise<void> => {
    let input: any = { method: 'PATCH' };
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    input = { operation: { method: 'PATCH' }};
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    input = { request: { method: 'PATCH' }};
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    input = { unknown: { method: 'PATCH' }};
    await expect(handler.canHandle(input)).rejects.toThrow('Could not find method in input object.');
  });

  it('calls the source extractor.', async(): Promise<void> => {
    await expect(handler.handle(operation)).resolves.toBe(result);
    expect(source.handle).toHaveBeenLastCalledWith(operation);
  });
});
