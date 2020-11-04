import { AllVoidCompositeHandler } from '../../../src/util/AllVoidCompositeHandler';
import type { AsyncHandler } from '../../../src/util/AsyncHandler';

describe('An AllVoidCompositeHandler', (): void => {
  let handler1: AsyncHandler<string>;
  let handler2: AsyncHandler<string>;
  let composite: AllVoidCompositeHandler<string>;

  beforeEach(async(): Promise<void> => {
    handler1 = { handleSafe: jest.fn() } as any;
    handler2 = { handleSafe: jest.fn() } as any;

    composite = new AllVoidCompositeHandler<string>([ handler1, handler2 ]);
  });

  it('can handle all input.', async(): Promise<void> => {
    await expect(composite.canHandle('test')).resolves.toBeUndefined();
  });

  it('runs all handlers without caring about their result.', async(): Promise<void> => {
    handler1.handleSafe = jest.fn(async(): Promise<void> => {
      throw new Error('error');
    });
    await expect(composite.handleSafe('test')).resolves.toBeUndefined();
    expect(handler1.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler1.handleSafe).toHaveBeenLastCalledWith('test');
    expect(handler2.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler2.handleSafe).toHaveBeenLastCalledWith('test');
  });
});
