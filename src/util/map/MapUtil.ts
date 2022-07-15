import type { SetMultiMap } from './SetMultiMap';

export type MapKey<T> = T extends Map<infer TKey, any> ? TKey : never;
export type MapValue<T> = T extends Map<any, infer TValue> ? TValue : never;
export type MapEntry<T> = T extends Map<any, any> ? [MapKey<T>, MapValue<T>] : never;

/**
 * A simplified version of {@link MapConstructor} that only allows creating an empty {@link Map}.
 */
export type EmptyMapConstructor = new() => Map<any, any>;

/**
 * Options describing the necessary changes when calling {@link modify}.
 */
export type ModifyOptions<T extends SetMultiMap<any, any>> = {
  /**
   * Entries that need to be added to the Map.
   */
  add?: Iterable<MapEntry<T>>;
  /**
   * Keys that need to be removed from the Map.
   */
  remove?: Iterable<MapKey<T>>;
};

/**
 * Modifies a {@link SetMultiMap} in place by removing and adding the requested entries.
 * Removals happen before additions.
 *
 * @param map - Map to start from.
 * @param options - {@link ModifyOptions} describing the necessary changes.
 */
export function modify<T extends SetMultiMap<any, any>>(map: T, options: ModifyOptions<T>): T {
  for (const key of options.remove ?? []) {
    map.delete(key);
  }
  for (const [ key, val ] of options.add ?? []) {
    map.add(key, val);
  }
  return map;
}

/**
 * Finds the result of calling `map.get(key)`.
 * If there is no result, it instead returns the default value.
 * The Map will also be updated to assign that default value to the given key.
 *
 * @param map - Map to use.
 * @param key - Key to find the value for.
 * @param defaultValue - Value to insert and return if no result was found.
 */
export function getDefault<TKey, TValue>(map: Map<TKey, TValue>, key: TKey, defaultValue: TValue): TValue {
  const value = map.get(key);
  if (value) {
    return value;
  }
  map.set(key, defaultValue);
  return defaultValue;
}
