import { LazyLogger } from '../../../src/logging/LazyLogger';
import { LazyLoggerFactory } from '../../../src/logging/LazyLoggerFactory';
import { getLoggerFor, resetGlobalLoggerFactory, setGlobalLoggerFactory } from '../../../src/logging/LogUtil';
import { VoidLogger } from '../../../src/logging/VoidLogger';
import { VoidLoggerFactory } from '../../../src/logging/VoidLoggerFactory';

describe('LogUtil', (): void => {
  beforeEach(async(): Promise<void> => {
    resetGlobalLoggerFactory();
  });

  it('allows creating a lazy logger for a string label.', async(): Promise<void> => {
    expect(getLoggerFor('MyLabel')).toBeInstanceOf(LazyLogger);
    expect((getLoggerFor('MyLabel') as any).label).toBe('MyLabel');
  });

  it('allows creating a lazy logger for a class instance.', async(): Promise<void> => {
    expect(getLoggerFor(new VoidLogger())).toBeInstanceOf(LazyLogger);
    expect((getLoggerFor(new VoidLogger()) as any).label).toBe('VoidLogger');
  });

  it('allows setting the global logger factory.', async(): Promise<void> => {
    setGlobalLoggerFactory(new VoidLoggerFactory());
    expect(LazyLoggerFactory.getInstance().loggerFactory).toBeInstanceOf(VoidLoggerFactory);
  });

  it('allows unsetting the global logger factory.', async(): Promise<void> => {
    setGlobalLoggerFactory(new VoidLoggerFactory());
    resetGlobalLoggerFactory();
    expect((): any => LazyLoggerFactory.getInstance().loggerFactory)
      .toThrow('No logger factory has been set. Can be caused by logger invocation during initialization.');
  });
});
