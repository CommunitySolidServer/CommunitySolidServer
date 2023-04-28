import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { BaseReadWriteLocker } from './BaseReadWriteLocker';
import { MemoryResourceLocker } from './MemoryResourceLocker';
import type { ResourceLocker } from './ResourceLocker';

/**
 * A {@link BaseReadWriteLocker} that stores the counter and its associated locks in memory.
 * The consequence of this is that multiple read requests are possible as long as they occur on the same worker thread.
 * A read request from a different worker thread will have to wait
 * until those from the current worker thread are finished.
 *
 * The main reason for this class is due to the file locker that we use only allowing locks to be released
 * by the same worker thread that acquired them.
 */
export class PartialReadWriteLocker extends BaseReadWriteLocker {
  private readonly readCount: Map<string, number>;

  public constructor(locker: ResourceLocker) {
    // This goes against how we generally link classes together using Components.js.
    // The reason for doing this is that `MemoryResourceLocker` implements `SingleThreaded`,
    // meaning that when the server is started with worker threads an error will be thrown by Components.js.
    // Instantiating it here "hides" it from Components.js.
    // If at some point in the future this causes issues because we want to split up the code,
    // this should not be blocking and an alternative solution should be used,
    // such as removing the SingleThreaded interface from the locker.
    super(locker, new MemoryResourceLocker());
    this.readCount = new Map();
  }

  protected getCountLockIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return identifier;
  }

  protected modifyCount(identifier: ResourceIdentifier, mod: number): number {
    const modified = (this.readCount.get(identifier.path) ?? 0) + mod;
    if (modified === 0) {
      this.readCount.delete(identifier.path);
    } else {
      this.readCount.set(identifier.path, modified);
    }
    return modified;
  }
}
