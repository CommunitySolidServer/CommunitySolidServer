import type { DataAccessor } from './DataAccessor';

/**
 * The AtomicDataAccessor is exactly the same as a DataAccessor with the only
 * thing added being that everything works with atomicity in mind.
 */
export interface AtomicDataAccessor extends DataAccessor { }
