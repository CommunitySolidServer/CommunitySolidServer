import type { Quad } from '@rdfjs/types';
import type { Patch } from './Patch';

/**
 * A Representation of an N3 Patch.
 * All quads should be in the default graph.
 */
export interface N3Patch extends Patch {
  deletes: Quad[];
  inserts: Quad[];
  conditions: Quad[];
}

export function isN3Patch(patch: unknown): patch is N3Patch {
  return Array.isArray((patch as N3Patch).deletes) &&
    Array.isArray((patch as N3Patch).inserts) &&
    Array.isArray((patch as N3Patch).conditions);
}
