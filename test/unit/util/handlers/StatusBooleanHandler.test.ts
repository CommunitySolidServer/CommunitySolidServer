import type { AsyncHandler } from 'asynchronous-handlers';
import { StatusBooleanHandler } from '../../../../src/util/handlers/StatusBooleanHandler';

describe('A StatusBooleanHandler', (): void => {
  let handlers: jest.Mocked<AsyncHandler<string, boolean>>[];
  let handler: StatusBooleanHandler<string>;

  beforeEach(async(): Promise<void> => {
    handlers = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue(false),
      } satisfies Partial<AsyncHandler<string, boolean>> as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue(true),
      } satisfies Partial<AsyncHandler<string, boolean>> as any,
    ];

    handler = new StatusBooleanHandler(handlers);
  });

  it('returns true if one of the handlers returns true.', async(): Promise<void> => {
    await expect(handler.handleSafe('input')).resolves.toBe(true);
  });
});
