import type { ResourceIdentifier } from '../../../../src';
import { VoidLocker } from '../../../../src/util/locking/VoidLocker';

describe('A VoidLocker', (): void => {
  it('invokes the whileLocked function immediately with readLock.', async(): Promise<void> => {
    const locker = new VoidLocker();
    const identifier: ResourceIdentifier = { path: 'http://test.com/res' };
    const whileLocked = jest.fn().mockImplementation((maintainLockFn: () => void): void => {
      maintainLockFn();
    });

    await locker.withReadLock(identifier, whileLocked);

    expect(whileLocked).toHaveBeenCalledTimes(1);
  });

  it('invokes the whileLocked function immediately with writeLock.', async(): Promise<void> => {
    const locker = new VoidLocker();
    const identifier: ResourceIdentifier = { path: 'http://test.com/res' };
    const whileLocked = jest.fn().mockImplementation((maintainLockFn: () => void): void => {
      maintainLockFn();
    });
    await locker.withWriteLock(identifier, whileLocked);

    expect(whileLocked).toHaveBeenCalledTimes(1);
  });
});
