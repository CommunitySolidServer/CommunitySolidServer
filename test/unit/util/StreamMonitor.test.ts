import { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { StreamMonitor } from '../../../src/util/StreamMonitor';

class DummyMonitor extends StreamMonitor {
  public logger: any;

  public constructor(stream: Readable, name?: string) {
    super(stream, name);
    this.logger = jest.fn();
  }
}

describe('A StreamMonitor', (): void => {
  it('does nothing if it was released and the stream ended correctly.', async(): Promise<void> => {
    const stream = Readable.from([ 'data' ]);
    const monitor = new StreamMonitor(stream);
    await expect(arrayifyStream(stream)).resolves.toEqual([ 'data' ]);
    expect(monitor.release()).toBeUndefined();
  });

  it('errors if release is called twice.', async(): Promise<void> => {
    const stream = Readable.from([ 'data' ]);
    const monitor = new StreamMonitor(stream);
    expect(monitor.release()).toBeUndefined();
    expect((): void => monitor.release()).toThrow(new Error('Release called more than once'));
  });

  it('throws an error on release if there was an error in the stream.', async(): Promise<void> => {
    const stream = Readable.from([ 'data' ]);
    stream.read = (): any => {
      stream.emit('error', new Error('bad data!'));
      return null;
    };
    const monitor = new StreamMonitor(stream);
    await expect(arrayifyStream(stream)).rejects.toThrow(new Error('bad data!'));
    expect((): void => monitor.release()).toThrow(new Error('bad data!'));
  });

  it('logs a warning if the monitor is not released in time.', async(): Promise<void> => {
    jest.useFakeTimers();

    const stream = Readable.from([ 'data' ]);
    const monitor = new DummyMonitor(stream);
    monitor.logger = {
      warn: jest.fn(),
    };
    await expect(arrayifyStream(stream)).resolves.toEqual([ 'data' ]);
    jest.advanceTimersByTime(1000);
    expect(monitor.logger.warn).toHaveBeenCalledTimes(1);
    expect(monitor.logger.warn).toHaveBeenLastCalledWith(`unknown monitor was not released but stream ended`);
  });

  it('can log a monitor identifier to discover which monitor failed.', async(): Promise<void> => {
    jest.useFakeTimers();

    const stream = Readable.from([ 'data' ]);
    const monitor = new DummyMonitor(stream, 'dummy');
    monitor.logger = {
      warn: jest.fn(),
    };
    await expect(arrayifyStream(stream)).resolves.toEqual([ 'data' ]);
    jest.advanceTimersByTime(1000);
    expect(monitor.logger.warn).toHaveBeenCalledTimes(1);
    expect(monitor.logger.warn).toHaveBeenLastCalledWith(`dummy monitor was not released but stream ended`);
  });

  it('logs no warning if the monitor was released in time.', async(): Promise<void> => {
    jest.useFakeTimers();

    const stream = Readable.from([ 'data' ]);
    const monitor = new DummyMonitor(stream);
    monitor.logger = {
      warn: jest.fn(),
    };
    await expect(arrayifyStream(stream)).resolves.toEqual([ 'data' ]);
    expect(monitor.release()).toBeUndefined();
    jest.advanceTimersByTime(1000);
    expect(monitor.logger.warn).toHaveBeenCalledTimes(0);
  });
});
