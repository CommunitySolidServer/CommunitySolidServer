import type { Logger } from '../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../src/logging/LogUtil';
import { KeyValueChannelSweeper } from '../../../../src/server/notifications/KeyValueChannelSweeper';
import type { NotificationChannel } from '../../../../src/server/notifications/NotificationChannel';
import type { NotificationChannelStorage } from '../../../../src/server/notifications/NotificationChannelStorage';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { flushPromises } from '../../../util/Util';

jest.mock('../../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { error: jest.fn(), debug: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A KeyValueChannelSweeper', (): void => {
  const logger = getLoggerFor('mock');
  const topic = 'http://example.com/foo';
  const expired: NotificationChannel = {
    id: 'http://example.com/.notifications/expired',
    topic,
    type: 'WebSocketChannel2023',
    endAt: 0,
  };
  const active: NotificationChannel = {
    id: 'http://example.com/.notifications/active',
    topic,
    type: 'WebSocketChannel2023',
    endAt: Date.now() + (24 * 60 * 60 * 1000),
  };
  const endless: NotificationChannel = {
    id: 'http://example.com/.notifications/endless',
    topic,
    type: 'WebSocketChannel2023',
  };
  let map: Map<string, unknown>;
  let storage: KeyValueStorage<string, unknown>;
  let channelStorage: jest.Mocked<NotificationChannelStorage>;
  let setIntervalSpy: jest.SpyInstance;
  let sweeper: KeyValueChannelSweeper;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    map = new Map<string, unknown>([
      [ encodeURIComponent(expired.id), expired ],
      [ encodeURIComponent(active.id), active ],
      [ encodeURIComponent(endless.id), endless ],
      [ encodeURIComponent(topic), [ expired.id, active.id, endless.id ]],
    ]);
    storage = {
      entries: jest.fn(async function* (): AsyncIterableIterator<[string, unknown]> {
        yield* map.entries();
      }),
    } as any;

    channelStorage = {
      get: jest.fn(),
    } as any;
  });

  afterEach(async(): Promise<void> => {
    await sweeper?.handle();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('uses a default interval of 60 minutes with up to 15% jitter.', async(): Promise<void> => {
    sweeper = new KeyValueChannelSweeper(storage, channelStorage);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy.mock.calls[0][1]).toBe((60 * 60 * 1000) + (0.5 * 0.15 * 60 * 60 * 1000));
  });

  it('ignores negative and invalid jitter values.', async(): Promise<void> => {
    sweeper = new KeyValueChannelSweeper(storage, channelStorage, 1, -1);
    await sweeper.handle();
    sweeper = new KeyValueChannelSweeper(storage, channelStorage, 1, Number.NaN);
    expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    expect(setIntervalSpy.mock.calls[0][1]).toBe(60 * 1000);
    expect(setIntervalSpy.mock.calls[1][1]).toBe(60 * 1000);
  });

  it('does not keep the process alive.', async(): Promise<void> => {
    sweeper = new KeyValueChannelSweeper(storage, channelStorage, 1, 0);
    const timer = setIntervalSpy.mock.results[0].value as NodeJS.Timeout;
    expect(timer.hasRef()).toBe(false);
  });

  it('does nothing if the interval is 0.', async(): Promise<void> => {
    sweeper = new KeyValueChannelSweeper(storage, channelStorage, 0);
    expect(setIntervalSpy).toHaveBeenCalledTimes(0);
    await expect(sweeper.handle()).resolves.toBeUndefined();
  });

  it('requests the expired channels so they get removed.', async(): Promise<void> => {
    sweeper = new KeyValueChannelSweeper(storage, channelStorage, 1, 0);
    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(channelStorage.get).toHaveBeenCalledTimes(1);
    expect(channelStorage.get).toHaveBeenLastCalledWith(expired.id);
  });

  it('does not start a sweep while the previous one is still running.', async(): Promise<void> => {
    let release!: () => void;
    channelStorage.get.mockImplementationOnce(async(): Promise<undefined> => new Promise((resolve): void => {
      release = (): void => resolve(undefined);
    }));
    sweeper = new KeyValueChannelSweeper(storage, channelStorage, 1, 0);
    await jest.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(storage.entries).toHaveBeenCalledTimes(1);

    release();
    await flushPromises();
    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(storage.entries).toHaveBeenCalledTimes(2);
  });

  it('stops sweeping and waits for the active sweep when finalized.', async(): Promise<void> => {
    let release!: () => void;
    channelStorage.get.mockImplementationOnce(async(): Promise<undefined> => new Promise((resolve): void => {
      release = (): void => resolve(undefined);
    }));
    sweeper = new KeyValueChannelSweeper(storage, channelStorage, 1, 0);
    await jest.advanceTimersByTimeAsync(60 * 1000);

    let finalized = false;
    const promise = sweeper.handle().then((): void => {
      finalized = true;
    });
    await flushPromises();
    expect(finalized).toBe(false);
    expect(jest.getTimerCount()).toBe(0);

    release();
    await promise;
    expect(finalized).toBe(true);
    await jest.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(storage.entries).toHaveBeenCalledTimes(1);
  });

  it('can be finalized if the active sweep fails.', async(): Promise<void> => {
    let reject!: () => void;
    channelStorage.get.mockImplementationOnce(async(): Promise<undefined> => new Promise((resolve, rej): void => {
      reject = (): void => rej(new Error('bad data'));
    }));
    sweeper = new KeyValueChannelSweeper(storage, channelStorage, 1, 0);
    await jest.advanceTimersByTimeAsync(60 * 1000);

    const promise = sweeper.handle();
    reject();
    await expect(promise).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith(
      'Error during interval callback: Failed to remove expired notification channels - bad data',
    );
  });
});
