import type { EventEmitter } from 'events';
import type { Lock } from './Lock';

/**
 * ExpiringLock used by a {@link ExpiringResourceLocker} for non-atomic operations.
 * Emits an "expired" event when internal timer runs out and should call release function when this happen.
 */
export interface ExpiringLock extends Lock, EventEmitter {
  /**
   * Reset the unlock timer.
   */
  renew: () => void;
}
