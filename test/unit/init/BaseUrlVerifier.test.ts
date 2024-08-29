import { getLoggerFor } from 'global-logger-factory';
import type { Logger } from 'global-logger-factory';
import { BaseUrlVerifier } from '../../../src/init/BaseUrlVerifier';
import type { KeyValueStorage } from '../../../src/storage/keyvalue/KeyValueStorage';

jest.mock('global-logger-factory', (): any => {
  const logger: Logger = { warn: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A BaseUrlVerifier', (): void => {
  const logger: jest.Mocked<Logger> = getLoggerFor(BaseUrlVerifier) as any;
  const baseUrl1 = 'http://base1.example.com/';
  const baseUrl2 = 'http://base2.example.com/';
  const storageKey = 'uniqueKey';
  let storage: KeyValueStorage<string, string>;

  beforeEach(async(): Promise<void> => {
    storage = new Map<string, string>() as any;
    jest.clearAllMocks();
  });

  it('stores the value if no value was stored yet.', async(): Promise<void> => {
    const initializer = new BaseUrlVerifier(baseUrl1, storageKey, storage);
    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });

  it('logs a warning in case the value changes.', async(): Promise<void> => {
    let initializer = new BaseUrlVerifier(baseUrl1, storageKey, storage);
    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(0);

    initializer = new BaseUrlVerifier(baseUrl2, storageKey, storage);
    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
