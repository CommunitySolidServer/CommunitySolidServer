/**
 * A SetMultiMap is a Map where a single key can have multiple unique values.
 * Deleting a key removes all bindings with this key from the Map.
 * Setting a value for a key replaces all previous bindings with this key.
 * Using an empty Set when calling the `set` function is the same as deleting that key.
 */
export interface SetMultiMap<TKey, TVal> extends Map<TKey, TVal | ReadonlySet<TVal>> {
  /**
   * Returns all values stored for the given key.
   * Returns `undefined` if there are no values for this key.
   */
  get: (key: TKey) => ReadonlySet<TVal> | undefined;
  /**
   * Returns true if this key/value binding exists in the Map.
   */
  hasEntry: (key: TKey, value: TVal) => boolean;
  /**
   * Adds the given key/value binding to the Map.
   */
  add: (key: TKey, value: TVal | ReadonlySet<TVal>) => this;
  /**
   * Deletes the given key/value binding from the Map.
   */
  deleteEntry: (key: TKey, value: TVal) => boolean;

  /**
   * Returns a Readonly {@link Map} representation of this Map.
   */
  asMap: () => ReadonlyMap<TKey, ReadonlySet<TVal>>;

  /**
   * Iterates over all key/value bindings in this Map.
   */
  [Symbol.iterator]: () => IterableIterator<[TKey, TVal]>;
  /**
   * Iterates over all key/value bindings in this Map.
   */
  entries: () => IterableIterator<[TKey, TVal]>;
  /**
   * Iterates over all distinct keys in this Map, together with a {@link Set} of their values.
   */
  entrySets: () => IterableIterator<[TKey, ReadonlySet<TVal>]>;
  /**
   * Iterates over all distinct keys in this Map.
   */
  distinctKeys: () => IterableIterator<TKey>;
  /**
   * Iterates over all values in this Map.
   */
  values: () => IterableIterator<TVal>;
  /**
   * Iterates over all distinct keys and returns their {@link Set} of values.
   */
  valueSets: () => IterableIterator<ReadonlySet<TVal>>;
  /**
   * Loops over all key/value bindings.
   */
  forEach: (callbackfn: (value: TVal, key: TKey, map: SetMultiMap<TKey, TVal>) => void, thisArg?: unknown) => void;
}
