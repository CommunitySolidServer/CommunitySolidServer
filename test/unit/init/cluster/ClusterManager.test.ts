import cluster from 'node:cluster';
import EventEmitter from 'node:events';
import { cpus } from 'node:os';
import { ClusterManager } from '../../../../src';
import * as LogUtil from '../../../../src/logging/LogUtil';

jest.mock('node:cluster');
jest.mock('node:os', (): any => ({
  ...jest.requireActual('node:os'),
  cpus: jest.fn().mockImplementation((): any => [{}, {}, {}, {}, {}, {}]),
}));

const mockWorker = new EventEmitter() as any;
mockWorker.process = { pid: 666 };

describe('A ClusterManager', (): void => {
  const emitter = new EventEmitter();
  const mockCluster = jest.requireMock('node:cluster');
  const mockLogger = { info: jest.fn(), warn: jest.fn() };
  jest.spyOn(LogUtil, 'getLoggerFor').mockImplementation((): any => mockLogger);

  beforeAll((): void => {
    Object.assign(mockCluster, {
      fork: jest.fn().mockImplementation((): any => mockWorker),
      on: jest.fn().mockImplementation(emitter.on.bind(emitter)),
      emit: jest.fn().mockImplementation(emitter.emit.bind(emitter)),
      isMaster: true,
      isWorker: false,
    });
  });

  it('can handle workers input as string.', (): void => {
    const cm = new ClusterManager(4);
    expect(cm.isSingleThreaded()).toBeFalsy();
  });

  it('can distinguish between ClusterModes.', (): void => {
    const cm1 = new ClusterManager(-1);
    const cm2 = new ClusterManager(0);
    const cm3 = new ClusterManager(1);
    const cm4 = new ClusterManager(2);
    expect(cm1.isSingleThreaded()).toBeFalsy();
    expect(cm2.isSingleThreaded()).toBeFalsy();
    expect(cm3.isSingleThreaded()).toBeTruthy();
    expect(cm4.isSingleThreaded()).toBeFalsy();
  });

  it('errors on invalid workers amount.', (): void => {
    expect((): ClusterManager => new ClusterManager(10)).toBeDefined();
    expect((): ClusterManager => new ClusterManager(2)).toBeDefined();
    expect((): ClusterManager => new ClusterManager(1)).toBeDefined();
    expect((): ClusterManager => new ClusterManager(0)).toBeDefined();
    expect((): ClusterManager => new ClusterManager(-1)).toBeDefined();
    expect((): ClusterManager => new ClusterManager(-5)).toBeDefined();
    expect((): ClusterManager => new ClusterManager(-6)).toThrow('Invalid workers value');
    expect((): ClusterManager => new ClusterManager(-10)).toThrow('Invalid workers value');
  });

  it('has an isPrimary() that works.', (): void => {
    const cm = new ClusterManager(-1);
    expect(cm.isPrimary()).toBeTruthy();
  });

  it('has an isWorker() that works.', (): void => {
    const cm = new ClusterManager(-1);
    expect(cm.isWorker()).toBeFalsy();
  });

  it('can autoscale to num_cpu and applies proper logging.', (): void => {
    const cm = new ClusterManager(-1);
    const workers = cpus().length - 1;
    expect(cpus()).toHaveLength(workers + 1);
    Object.assign(cm, { logger: mockLogger });

    cm.spawnWorkers();

    expect(mockLogger.info).toHaveBeenCalledWith(`Setting up ${workers} workers`);

    for (let i = 0; i < workers; i++) {
      mockCluster.emit('online', mockWorker);
    }

    expect(cluster.on).toHaveBeenCalledWith('online', expect.any(Function));
    expect(cluster.fork).toHaveBeenCalledTimes(workers);
    expect(mockLogger.info).toHaveBeenLastCalledWith(`All ${workers} requested workers have been started.`);

    expect(cluster.on).toHaveBeenCalledWith('exit', expect.any(Function));
    const code = 333;
    const signal = 'exiting';
    mockCluster.emit('exit', mockWorker, code, signal);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      `Worker ${mockWorker.process.pid} died with code ${code} and signal ${signal}`,
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(`Starting a new worker`);
  });

  it('can receive message from spawned workers.', (): void => {
    const cm = new ClusterManager(2);
    Object.assign(cm, { logger: mockLogger });

    cm.spawnWorkers();
    const msg = 'Hi from worker!';
    mockWorker.emit('message', msg);
    expect(mockLogger.info).toHaveBeenCalledWith(msg);
  });
});
