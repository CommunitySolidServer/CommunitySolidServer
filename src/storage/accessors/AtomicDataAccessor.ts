import type { DataAccessor } from './DataAccessor';

/**
 * The AtomicDataAccessor interface has identical function signatures as
 * the DataAccessor, with the additional constraint that every function call
 * must be atomic in its effect: either the call fully succeeds, reaching the
 * desired new state; or it fails, upon which the resulting state remains
 * identical to the one before the call.
 */
export interface AtomicDataAccessor extends DataAccessor { }
