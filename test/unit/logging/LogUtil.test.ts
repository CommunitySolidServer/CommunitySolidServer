import { getLoggerFor, resetInternalLoggerFactory, setGlobalLoggerFactory } from '../../../src/logging/LogUtil';

let currentFactory: any;

class Dummy {
  private readonly label = 'dummy';
}

describe('LogUtil', (): void => {
  beforeAll((): void => {
    resetInternalLoggerFactory();
    resetInternalLoggerFactory({
      get loggerFactory(): any {
        return currentFactory;
      },
      set loggerFactory(value: any) {
        currentFactory = value;
      },
      createLogger: jest.fn((label: string): any => ({ label })),
    } as any);
  });

  it('allows creating a lazy logger for a string label.', async(): Promise<void> => {
    expect(getLoggerFor('MyLabel')).toEqual({ label: 'MyLabel' });
  });

  it('allows creating a lazy logger for a class instance.', async(): Promise<void> => {
    expect(getLoggerFor(new Dummy())).toEqual({ label: 'Dummy' });
  });

  it('reuses loggers for instances of the same class.', async(): Promise<void> => {
    expect(getLoggerFor(new Dummy())).toBe(getLoggerFor(new Dummy()));
  });

  it('allows setting the global logger factory.', async(): Promise<void> => {
    const factory = {} as any;
    setGlobalLoggerFactory(factory);
    expect(currentFactory).toBe(factory);
  });
});
