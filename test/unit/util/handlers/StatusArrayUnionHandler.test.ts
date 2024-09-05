import type { AsyncHandler } from 'asynchronous-handlers';
import { StatusArrayUnionHandler } from '../../../../src/util/handlers/StatusArrayUnionHandler';

describe('A StatusArrayUnionHandler', (): void => {
  let handlers: jest.Mocked<AsyncHandler<string, number[]>>[];
  let handler: StatusArrayUnionHandler<AsyncHandler<string, number[]>>;

  beforeEach(async(): Promise<void> => {
    handlers = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue([ 1, 2 ]),
      } satisfies Partial<AsyncHandler<string, number[]>> as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue([ 3, 4 ]),
      } satisfies Partial<AsyncHandler<string, number[]>> as any,
    ];

    handler = new StatusArrayUnionHandler(handlers);
  });

  it('merges the array results.', async(): Promise<void> => {
    await expect(handler.handle('input')).resolves.toEqual([ 1, 2, 3, 4 ]);
    expect(handlers[0].handle).toHaveBeenCalledTimes(1);
    expect(handlers[0].handle).toHaveBeenLastCalledWith('input');
    expect(handlers[1].handle).toHaveBeenCalledTimes(1);
    expect(handlers[1].handle).toHaveBeenLastCalledWith('input');
  });
});
