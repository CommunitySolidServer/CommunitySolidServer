import type { AsyncHandler } from 'asynchronous-handlers';
import { StatusWaterfallHandler } from '../../../../src/util/handlers/StatusWaterfallHandler';

describe('A StatusBooleanHandler', (): void => {
  let handlers: jest.Mocked<AsyncHandler<string, boolean>>[];
  let handler: StatusWaterfallHandler<string, boolean>;

  beforeEach(async(): Promise<void> => {
    handlers = [
      {
        canHandle: jest.fn().mockRejectedValue(new Error('no handle')),
        handle: jest.fn().mockResolvedValue(false),
      } satisfies Partial<AsyncHandler<string, boolean>> as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue(true),
      } satisfies Partial<AsyncHandler<string, boolean>> as any,
    ];

    handler = new StatusWaterfallHandler(handlers);
  });

  it('returns true if one of the handlers returns true.', async(): Promise<void> => {
    await expect(handler.handleSafe('input')).resolves.toBe(true);
  });
});
