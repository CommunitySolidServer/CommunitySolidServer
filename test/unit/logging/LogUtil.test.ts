import { LazyLogger } from '../../../src/logging/LazyLogger';
import { LazyLoggerFactory } from '../../../src/logging/LazyLoggerFactory';
import { getLoggerFor, setGlobalLoggerFactory } from '../../../src/logging/LogUtil';
import { VoidLogger } from '../../../src/logging/VoidLogger';
import { VoidLoggerFactory } from '../../../src/logging/VoidLoggerFactory';

describe('LogUtil', (): void => {
  beforeEach(async(): Promise<void> => {
    setGlobalLoggerFactory(undefined);
  });

  it('allows creating a lazy logger for a string label.', async(): Promise<void> => {
    expect(getLoggerFor('MyLabel')).toBeInstanceOf(LazyLogger);
    expect((getLoggerFor('MyLabel') as any).label).toEqual('MyLabel');
  });

  it('allows creating a lazy logger for a class instance.', async(): Promise<void> => {
    expect(getLoggerFor(new VoidLogger())).toBeInstanceOf(LazyLogger);
    expect((getLoggerFor(new VoidLogger()) as any).label).toEqual('VoidLogger');
  });

  it('allows setting the global logger factory.', async(): Promise<void> => {
    expect(setGlobalLoggerFactory(new VoidLoggerFactory()));
    expect(LazyLoggerFactory.getInstance().getLoggerFactoryOrThrow()).toBeInstanceOf(VoidLoggerFactory);
  });

  it('allows unsetting the global logger factory.', async(): Promise<void> => {
    expect(setGlobalLoggerFactory(new VoidLoggerFactory()));
    expect(setGlobalLoggerFactory(undefined));
    expect((): any => LazyLoggerFactory.getInstance().getLoggerFactoryOrThrow())
      .toThrow(new Error('No logger factory has been set yet. Can be caused logger invocation during initialization.'));
  });
});
