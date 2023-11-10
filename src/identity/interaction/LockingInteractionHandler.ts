import type { Representation } from '../../http/representation/Representation';
import type { ReadWriteLocker } from '../../util/locking/ReadWriteLocker';
import type { AccountIdRoute } from './account/AccountIdRoute';
import type { InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';

const READ_METHODS = new Set([ 'OPTIONS', 'HEAD', 'GET' ]);

/**
 * An {@link InteractionHandler} that locks the path generated with the stored route during an operation.
 * If the route is the base account route, this can be used to prevent multiple operations on the same account.
 */
export class LockingInteractionHandler extends InteractionHandler {
  private readonly locker: ReadWriteLocker;
  private readonly accountRoute: AccountIdRoute;
  private readonly source: InteractionHandler;

  public constructor(locker: ReadWriteLocker, accountRoute: AccountIdRoute, source: InteractionHandler) {
    super();
    this.locker = locker;
    this.accountRoute = accountRoute;
    this.source = source;
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    return this.source.canHandle(input);
  }

  public async handle(input: InteractionHandlerInput): Promise<Representation> {
    const { accountId, operation } = input;

    // No lock if there is no account
    if (!accountId) {
      return this.source.handle(input);
    }

    const identifier = { path: this.accountRoute.getPath({ accountId }) };
    if (READ_METHODS.has(operation.method)) {
      return this.locker.withReadLock(identifier, async(): Promise<Representation> => this.source.handle(input));
    }

    return this.locker.withWriteLock(identifier, async(): Promise<Representation> => this.source.handle(input));
  }
}
