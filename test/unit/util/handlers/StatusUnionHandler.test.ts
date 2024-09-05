import type { AsyncHandler } from 'asynchronous-handlers';
import { StatusUnionHandler } from '../../../../src/util/handlers/StatusUnionHandler';

class SimpleUnionHandler extends StatusUnionHandler<AsyncHandler<any, string>> {
  protected async combine(results: string[]): Promise<string> {
    return results.join('');
  }
}

describe('A StatusUnionHandler', (): void => {
  const input = { data: 'text' };
  let handlers: jest.Mocked<AsyncHandler<any, string>>[];
  let handler: SimpleUnionHandler;

  beforeEach(async(): Promise<void> => {
    handlers = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue('a'),
      } satisfies Partial<AsyncHandler<any, string>> as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue('b'),
      } satisfies Partial<AsyncHandler<any, string>> as any,
    ];

    handler = new SimpleUnionHandler(handlers, true);
  });

  it('calls the combine function when calling canHandle.', async(): Promise<void> => {
    await expect(handler.canHandle(input)).resolves.toBeUndefined();

    expect(handlers[0].canHandle).toHaveBeenLastCalledWith(input);
    expect(handlers[1].canHandle).toHaveBeenLastCalledWith(input);
  });

  it('calls the combine function on handle calls.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe('ab');

    expect(handlers[0].handle).toHaveBeenLastCalledWith(input);
    expect(handlers[1].handle).toHaveBeenLastCalledWith(input);
  });
});
