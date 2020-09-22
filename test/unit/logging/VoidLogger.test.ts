import { VoidLogger } from '../../../src/logging/VoidLogger';

describe('VoidLogger', (): void => {
  let logger: VoidLogger;
  beforeEach(async(): Promise<void> => {
    logger = new VoidLogger();
  });

  it('does nothing when log is invoked.', async(): Promise<void> => {
    expect(logger.log('debug', 'my message', { abc: true })).toBe(logger);
  });
});
