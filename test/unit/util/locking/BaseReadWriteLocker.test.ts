import { EventEmitter } from 'node:events';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { BaseReadWriteLocker } from '../../../../src/util/locking/BaseReadWriteLocker';
import type { ResourceLocker } from '../../../../src/util/locking/ResourceLocker';
import { flushPromises } from '../../../util/Util';

// A simple ResourceLocker that keeps a queue of lock requests
class MemoryLocker implements ResourceLocker {
  private readonly locks: Record<string, (() => void)[]>;

  public constructor() {
    this.locks = {};
  }

  public async acquire(identifier: ResourceIdentifier): Promise<void> {
    const { path } = identifier;
    if (this.locks[path]) {
      return new Promise((resolve): void => {
        this.locks[path].push(resolve);
      });
    }
    this.locks[path] = [];
  }

  public async release(identifier: ResourceIdentifier): Promise<void> {
    const { path } = identifier;
    if (this.locks[path].length > 0) {
      this.locks[path].shift()!();
    } else {
      delete this.locks[path];
    }
  }
}

class SimpleReadWriteLocker extends BaseReadWriteLocker {
  private readonly countMap: Map<string, number>;

  public constructor(resourceLocker: ResourceLocker, countLocker: ResourceLocker) {
    super(resourceLocker, countLocker);
    this.countMap = new Map<string, number>();
  }

  protected getCountLockIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return identifier;
  }

  protected modifyCount(identifier: ResourceIdentifier, mod: number): number {
    const count = (this.countMap.get(identifier.path) ?? 0) + mod;
    this.countMap.set(identifier.path, count);
    return count;
  }
}

/* eslint-disable ts/no-floating-promises */
describe('A BaseReadWriteLocker', (): void => {
  let resourceLocker: ResourceLocker;
  let countLocker: ResourceLocker;
  const resourceId = { path: 'http://test.com/resource' };
  const resource2Id = { path: 'http://test.com/resource2' };
  let locker: BaseReadWriteLocker;

  beforeEach(async(): Promise<void> => {
    resourceLocker = new MemoryLocker();
    countLocker = new MemoryLocker();

    locker = new SimpleReadWriteLocker(resourceLocker, countLocker);
  });

  it('does not block single read operations.', async(): Promise<void> => {
    await expect(locker.withReadLock(resourceId, (): number => 5)).resolves.toBe(5);
  });

  it('does not block single write operations.', async(): Promise<void> => {
    await expect(locker.withWriteLock(resourceId, (): number => 5)).resolves.toBe(5);
  });

  it('does not block multiple read operations.', async(): Promise<void> => {
    const order: string[] = [];
    const emitter = new EventEmitter();

    const unlocks = [ 0, 1, 2 ].map((num): any => new Promise((resolve): any => emitter.on(`release${num}`, resolve)));
    const promises = [ 0, 1, 2 ].map((num): any => locker.withReadLock(resourceId, async(): Promise<number> => {
      order.push(`start ${num}`);
      await unlocks[num];
      order.push(`finish ${num}`);
      return num;
    }));

    // Allow time to attach listeners
    await flushPromises();

    emitter.emit('release2');
    await expect(promises[2]).resolves.toBe(2);
    emitter.emit('release0');
    await expect(promises[0]).resolves.toBe(0);
    emitter.emit('release1');
    await expect(promises[1]).resolves.toBe(1);

    expect(order).toEqual([ 'start 0', 'start 1', 'start 2', 'finish 2', 'finish 0', 'finish 1' ]);
  });

  it('blocks multiple write operations.', async(): Promise<void> => {
    // Previous test but with write locks
    const order: string[] = [];
    const emitter = new EventEmitter();

    const unlocks = [ 0, 1, 2 ].map((num): any => new Promise((resolve): any => emitter.on(`release${num}`, resolve)));
    const promises = [ 0, 1, 2 ].map((num): any => locker.withWriteLock(resourceId, async(): Promise<number> => {
      order.push(`start ${num}`);
      await unlocks[num];
      order.push(`finish ${num}`);
      return num;
    }));

    // Allow time to attach listeners
    await flushPromises();

    emitter.emit('release2');

    // Allow time to finish write 2
    await flushPromises();

    emitter.emit('release0');
    emitter.emit('release1');
    await Promise.all([ promises[2], promises[0], promises[1] ]);
    expect(order).toEqual([ 'start 0', 'finish 0', 'start 1', 'finish 1', 'start 2', 'finish 2' ]);
  });

  it('allows multiple write operations on different resources.', async(): Promise<void> => {
    // Previous test but with write locks
    const order: string[] = [];
    const emitter = new EventEmitter();

    const resources = [ resourceId, resource2Id ];
    const unlocks = [ 0, 1 ].map((num): any => new Promise((resolve): any => emitter.on(`release${num}`, resolve)));
    const promises = [ 0, 1 ].map((num): any => locker.withWriteLock(resources[num], async(): Promise<number> => {
      order.push(`start ${num}`);
      await unlocks[num];
      order.push(`finish ${num}`);
      return num;
    }));

    // Allow time to attach listeners
    await flushPromises();

    emitter.emit('release1');
    await expect(promises[1]).resolves.toBe(1);
    emitter.emit('release0');
    await expect(promises[0]).resolves.toBe(0);

    expect(order).toEqual([ 'start 0', 'start 1', 'finish 1', 'finish 0' ]);
  });

  it('blocks write operations during read operations.', async(): Promise<void> => {
    const order: string[] = [];
    const emitter = new EventEmitter();

    const promRead = new Promise((resolve): any => {
      emitter.on('releaseRead', resolve);
    });

    // We want to make sure the write operation only starts while the read operation is busy
    // Otherwise the internal write lock might not be acquired yet
    const delayedLockWrite = new Promise<void>((resolve): void => {
      emitter.on('readStarted', (): void => {
        locker.withWriteLock(resourceId, (): any => {
          order.push('write');
          resolve();
        });
      });
    });

    const lockRead = locker.withReadLock(resourceId, async(): Promise<void> => {
      emitter.emit('readStarted');
      order.push('read start');
      await promRead;
      order.push('read finish');
    });

    // Allow time to attach listeners
    await flushPromises();

    const promAll = Promise.all([ delayedLockWrite, lockRead ]);

    emitter.emit('releaseRead');
    await promAll;
    expect(order).toEqual([ 'read start', 'read finish', 'write' ]);
  });

  it('allows write operations on different resources during read operations.', async(): Promise<void> => {
    const order: string[] = [];
    const emitter = new EventEmitter();

    const promRead = new Promise((resolve): any => {
      emitter.on('releaseRead', resolve);
    });

    const delayedLockWrite = new Promise<void>((resolve): void => {
      emitter.on('readStarted', (): void => {
        locker.withWriteLock(resource2Id, (): any => {
          order.push('write');
          resolve();
        });
      });
    });

    const lockRead = locker.withReadLock(resourceId, async(): Promise<void> => {
      emitter.emit('readStarted');
      order.push('read start');
      await promRead;
      order.push('read finish');
    });

    // Allow time to attach listeners
    await flushPromises();

    const promAll = Promise.all([ delayedLockWrite, lockRead ]);

    emitter.emit('releaseRead');
    await promAll;
    expect(order).toEqual([ 'read start', 'write', 'read finish' ]);
  });

  it('prioritizes read operations when a read operation is waiting.', async(): Promise<void> => {
    // This test is very similar to the previous ones but adds an extra read lock
    const order: string[] = [];
    const emitter = new EventEmitter();

    const promRead1 = new Promise((resolve): any => emitter.on('releaseRead1', resolve));
    const promRead2 = new Promise((resolve): any => emitter.on('releaseRead2', resolve));

    const delayedLockWrite = new Promise<void>((resolve): void => {
      emitter.on('readStarted', (): void => {
        locker.withWriteLock(resourceId, (): any => {
          order.push('write');
          resolve();
        });
      });
    });

    const delayedLockRead2 = new Promise<void>((resolve): void => {
      emitter.on('readStarted', (): void => {
        locker.withReadLock(resourceId, async(): Promise<void> => {
          order.push('read 2 start');
          await promRead2;
          order.push('read 2 finish');
          resolve();
        });
      });
    });

    const lockRead = locker.withReadLock(resourceId, async(): Promise<void> => {
      emitter.emit('readStarted');
      order.push('read 1 start');
      await promRead1;
      order.push('read 1 finish');
    });

    // Allow time to attach listeners
    await flushPromises();

    const promAll = Promise.all([ delayedLockWrite, lockRead, delayedLockRead2 ]);

    emitter.emit('releaseRead1');

    // Allow time to finish read 1
    await flushPromises();

    emitter.emit('releaseRead2');
    await promAll;
    expect(order).toEqual([ 'read 1 start', 'read 2 start', 'read 1 finish', 'read 2 finish', 'write' ]);
  });

  it('blocks read operations during write operations.', async(): Promise<void> => {
    // Again similar but with read and write order switched
    const order: string[] = [];
    const emitter = new EventEmitter();

    const promWrite = new Promise((resolve): any => {
      emitter.on('releaseWrite', resolve);
    });

    // We want to make sure the read operation only starts while the write operation is busy
    const delayedLockRead = new Promise<void>((resolve): void => {
      emitter.on('writeStarted', (): void => {
        locker.withReadLock(resourceId, (): any => {
          order.push('read');
          resolve();
        });
      });
    });

    const lockWrite = locker.withWriteLock(resourceId, async(): Promise<void> => {
      emitter.emit('writeStarted');
      order.push('write start');
      await promWrite;
      order.push('write finish');
    });

    // Allow time to attach listeners
    await flushPromises();

    const promAll = Promise.all([ delayedLockRead, lockWrite ]);

    emitter.emit('releaseWrite');
    await promAll;
    expect(order).toEqual([ 'write start', 'write finish', 'read' ]);
  });
});
