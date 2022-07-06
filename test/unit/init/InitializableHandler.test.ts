import { InitializableHandler } from '../../../src';

describe('InitializableHandler', (): void => {
  const initializable = { initialize: jest.fn() };
  const initializer = new InitializableHandler(initializable);

  it('redirects handle towards initialize.', async(): Promise<void> => {
    await initializer.handleSafe();
    expect(initializable.initialize).toHaveBeenCalledTimes(1);
  });
});
