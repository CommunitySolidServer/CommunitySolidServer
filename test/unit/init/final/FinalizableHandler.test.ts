import { FinalizableHandler } from '../../../../src';

describe('FinalizableHandler', (): void => {
  const finalizable = { finalize: jest.fn() };
  const finalizer = new FinalizableHandler(finalizable);

  it('redirects handle towards finalize.', async(): Promise<void> => {
    await finalizer.handleSafe();
    expect(finalizable.finalize).toHaveBeenCalledTimes(1);
  });
});
