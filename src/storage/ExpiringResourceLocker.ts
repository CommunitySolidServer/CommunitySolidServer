import type { ExpiringLock } from './ExpiringLock';
import type { ResourceLocker } from './ResourceLocker';

/**
 * Allows the locking of resources which is needed for non-atomic {@link ResourceStore}s.
 * Specific {@link ResourceLocker} to work with {@link ExpiringLock}s.
 */
export interface ExpiringResourceLocker<T extends ExpiringLock = ExpiringLock> extends ResourceLocker<T> {}
