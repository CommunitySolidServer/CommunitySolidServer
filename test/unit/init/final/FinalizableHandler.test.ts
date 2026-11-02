import { FinalizableHandler } from '../../../../src';
import type { Finalizable } from '../../../../src';

describe('FinalizableHandler', (): void => {
  const finalizable = { finalize: jest.fn() };
  const finalizer = new FinalizableHandler(finalizable);

  it('redirects handle towards finalize.', async(): Promise<void> => {
    await finalizer.handleSafe();
    expect(finalizable.finalize).toHaveBeenCalledTimes(1);
  });

  it('does nothing if the input is not a Finalizable.', async(): Promise<void> => {
    const handler = new FinalizableHandler({} as Finalizable);
    await expect(handler.handleSafe()).resolves.toBeUndefined();
  });
});
