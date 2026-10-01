import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';

export function isInternalPath(identifier: ResourceIdentifier): boolean {
  let path = identifier.path;
  try {
    path = new URL(identifier.path).pathname;
  } catch {
    // Not a parseable URL — use the raw path as-is.
  }
  return path === '/.internal' || path.startsWith('/.internal/');
}
