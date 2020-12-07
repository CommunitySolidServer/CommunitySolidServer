import type { Initializer } from '../../../src/init/Initializer';
import { Setup } from '../../../src/init/Setup';

describe('Setup', (): void => {
  const initializer: jest.Mocked<Initializer> = {
    handleSafe: jest.fn(),
  } as any;

  beforeAll(async(): Promise<void> => {
    const setup = new Setup(initializer);
    await setup.setup();
  });

  it('calls the initializer.', async(): Promise<void> => {
    expect(initializer.handleSafe).toHaveBeenCalledTimes(1);
  });
});
