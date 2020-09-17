import type { ResourceStore } from './ResourceStore';

/**
 * A {@link ResourceStore} of which all operations are atomic.
 */
export interface AtomicResourceStore extends ResourceStore {}
