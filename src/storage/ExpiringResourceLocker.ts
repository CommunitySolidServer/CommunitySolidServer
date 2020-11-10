import type { ExpiringLock } from './ExpiringLock';
import type { ResourceLocker } from './ResourceLocker';

/**
 * Interface for a factory of expiring locks.
 */
export interface ExpiringResourceLocker<T extends ExpiringLock = ExpiringLock> extends ResourceLocker<T> {}
