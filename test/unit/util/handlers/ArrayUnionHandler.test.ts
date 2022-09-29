import { ArrayUnionHandler } from '../../../../src/util/handlers/ArrayUnionHandler';
import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';

describe('An ArrayUnionHandler', (): void => {
  let handlers: jest.Mocked<AsyncHandler<string, number[]>>[];
  let handler: ArrayUnionHandler<AsyncHandler<string, number[]>>;

  beforeEach(async(): Promise<void> => {
    handlers = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue([ 1, 2 ]),
      } as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue([ 3, 4 ]),
      } as any,
    ];

    handler = new ArrayUnionHandler(handlers);
  });

  it('merges the array results.', async(): Promise<void> => {
    await expect(handler.handle('input')).resolves.toEqual([ 1, 2, 3, 4 ]);
    expect(handlers[0].handle).toHaveBeenCalledTimes(1);
    expect(handlers[0].handle).toHaveBeenLastCalledWith('input');
    expect(handlers[1].handle).toHaveBeenCalledTimes(1);
    expect(handlers[1].handle).toHaveBeenLastCalledWith('input');
  });
});
