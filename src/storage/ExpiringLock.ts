import type { EventEmitter } from 'events';
import type { Lock } from './Lock';

/**
 * Interface for a lock that expires after a certain period of inactivity.
 * Activity can be signaled by calling `renew`, which resets the expiration timeout.
 * When the lock has expired, an `expired` event is emitted and the lock is released.
 */
export interface ExpiringLock extends Lock, EventEmitter {
  /**
   * Reset the lock expiration timeout.
   */
  renew: () => void;
}
