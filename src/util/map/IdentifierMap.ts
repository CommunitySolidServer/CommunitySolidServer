import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { HashMap } from './HashMap';
import { WrappedSetMultiMap } from './WrappedSetMultiMap';

/**
 * Converts a {@link ResourceIdentifier} into a string unique to that identifier.
 */
export function identifierHashFn(identifier: ResourceIdentifier): string {
  return identifier.path;
}

/**
 * A specific implementation of {@link HashMap} where the key type is {@link ResourceIdentifier}.
 */
export class IdentifierMap<T> extends HashMap<ResourceIdentifier, T> {
  public constructor(iterable?: Iterable<readonly [ResourceIdentifier, T]>) {
    super(identifierHashFn, iterable);
  }
}

/**
 * A specific implementation of {@link WrappedSetMultiMap} where the key type is {@link ResourceIdentifier}.
 */
export class IdentifierSetMultiMap<T> extends WrappedSetMultiMap<ResourceIdentifier, T> {
  public constructor(iterable?: Iterable<readonly [ResourceIdentifier, T | ReadonlySet<T>]>) {
    super(IdentifierMap, iterable);
  }
}
