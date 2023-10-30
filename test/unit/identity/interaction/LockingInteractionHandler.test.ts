import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { AccountIdRoute } from '../../../../src/identity/interaction/account/AccountIdRoute';
import type {
  InteractionHandler,
  InteractionHandlerInput,
} from '../../../../src/identity/interaction/InteractionHandler';
import { LockingInteractionHandler } from '../../../../src/identity/interaction/LockingInteractionHandler';
import type { ReadWriteLocker } from '../../../../src/util/locking/ReadWriteLocker';

describe('A LockingInteractionHandler', (): void => {
  const accountId = 'accountId';
  let input: InteractionHandlerInput;
  let locker: jest.Mocked<ReadWriteLocker>;
  let route: jest.Mocked<AccountIdRoute>;
  let source: jest.Mocked<InteractionHandler>;
  let handler: LockingInteractionHandler;

  beforeEach(async(): Promise<void> => {
    input = {
      operation: {
        method: 'GET',
        target: { path: 'http://example.com/foo' },
        preferences: {},
        body: new BasicRepresentation(),
      },
      accountId,
    };

    locker = {
      withReadLock: jest.fn(async(id, fn): Promise<any> => fn()),
      withWriteLock: jest.fn(async(id, fn): Promise<any> => fn()),
    };

    route = {
      matchPath: jest.fn(),
      getPath: jest.fn().mockReturnValue('http://example.com/accountId'),
    };

    source = {
      handleSafe: jest.fn(),
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue('response'),
    };

    handler = new LockingInteractionHandler(locker, route, source);
  });

  it('can handle input its source can handle.', async(): Promise<void> => {
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenCalledTimes(1);
    expect(source.canHandle).toHaveBeenLastCalledWith(input);

    const error = new Error('bad data');
    source.canHandle.mockRejectedValueOnce(error);
    await expect(handler.canHandle(input)).rejects.toThrow(error);
  });

  it('does not create a lock if there is no account ID.', async(): Promise<void> => {
    delete input.accountId;
    await expect(handler.handle(input)).resolves.toBe('response');
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
    expect(locker.withReadLock).toHaveBeenCalledTimes(0);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(0);
  });

  it('creates a read lock for read operations.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe('response');
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(0);
  });

  it('creates a write lock for write operations.', async(): Promise<void> => {
    input.operation.method = 'PUT';
    await expect(handler.handle(input)).resolves.toBe('response');
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
    expect(locker.withReadLock).toHaveBeenCalledTimes(0);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
  });
});
