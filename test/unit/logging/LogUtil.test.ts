import { LazyLogger } from '../../../src/logging/LazyLogger';
import { LazyLoggerFactory } from '../../../src/logging/LazyLoggerFactory';
import { getLoggerFor } from '../../../src/logging/LogUtil';
import { VoidLogger } from '../../../src/logging/VoidLogger';

describe('LogUtil', (): void => {
  beforeEach(async(): Promise<void> => {
    LazyLoggerFactory.getInstance().setLoggerFactory(undefined);
  });

  it('allows creating a lazy logger for a string label.', async(): Promise<void> => {
    expect(getLoggerFor('MyLabel')).toBeInstanceOf(LazyLogger);
    expect((getLoggerFor('MyLabel') as any).label).toEqual('MyLabel');
  });

  it('allows creating a lazy logger for a class instance.', async(): Promise<void> => {
    expect(getLoggerFor(new VoidLogger())).toBeInstanceOf(LazyLogger);
    expect((getLoggerFor(new VoidLogger()) as any).label).toEqual('VoidLogger');
  });
});
