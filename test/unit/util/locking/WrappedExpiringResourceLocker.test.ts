import { WrappedExpiringResourceLocker } from '../../../../src/util/locking/WrappedExpiringResourceLocker';

describe('A WrappedExpiringResourceLocker', (): void => {
  it('emits an error event when releasing the lock errors.', async(): Promise<void> => {
    jest.useFakeTimers();

    // Create a locker that fails upon release
    const faultyLocker = {
      acquire(): any {
        return {
          async release(): Promise<never> {
            throw new Error('Release error');
          },
        };
      },
    };
    const expiringLocker = new WrappedExpiringResourceLocker(faultyLocker, 1000);
    const expiringLock = await expiringLocker.acquire({} as any);
    const errorCallback = jest.fn();
    expiringLock.on('error', errorCallback);

    // Let the lock expire
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // Verify the error has been emitted
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new Error('Release error'));
  });
});
