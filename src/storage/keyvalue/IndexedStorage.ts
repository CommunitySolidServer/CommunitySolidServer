/**
 * The key that needs to be present in all output results of {@link IndexedStorage}.
 */
export const INDEX_ID_KEY = 'id';

/**
 * Used to define the value of a key in a type entry of a {@link IndexedStorage}.
 * Valid values are `"string"`, `"boolean"`, `"number"` and `"id:TYPE"`,
 * with TYPE being one of the types in the definition.
 * In the latter case this means that key points to an identifier of the specified type.
 * A `?` can be appended to the type to indicate this key is optional.
 */
export type ValueTypeDescription<TType = string> =
  `${('string' | 'boolean' | 'number' | (TType extends string ? `${typeof INDEX_ID_KEY}:${TType}` : never))}${
  '?' | ''}`;

/**
 * Converts a {@link ValueTypeDescription} to the type it should be interpreted as.
 */
export type ValueType<T extends ValueTypeDescription> =
  (T extends 'boolean' | 'boolean?' ? boolean : T extends 'number' | 'number?' ? number : string) |
  (T extends `${string}?` ? undefined : never);

/**
 * Used to filter on optional keys in a {@link IndexedStorage} definition.
 */
export type OptionalKey<T> = {[K in keyof T ]: T[K] extends `${string}?` ? K : never }[keyof T];

/**
 * Converts a {@link IndexedStorage} definition of a specific type
 * to the typing an object would have that is returned as an output on function calls.
 */
export type TypeObject<TDesc extends Record<string, ValueTypeDescription>> = {
  -readonly [K in Exclude<keyof TDesc, OptionalKey<TDesc>>]: ValueType<TDesc[K]>;
} & {
  -readonly [K in keyof TDesc]?: ValueType<TDesc[K]>;
} & { [INDEX_ID_KEY]: string };

/**
 * Input expected for `create()` call in {@link IndexedStorage}.
 * This is the same as {@link TypeObject} but without the index key.
 */
export type CreateTypeObject<T extends Record<string, ValueTypeDescription>> = Omit<TypeObject<T>, typeof INDEX_ID_KEY>;

/**
 * Key of an object that is also a string.
 */
export type StringKey<T> = keyof T & string;

/**
 * The description of a single type in an {@link IndexedStorage}.
 */
export type IndexTypeDescription<TType = never> = Record<string, ValueTypeDescription<TType>>;

/**
 * The full description of all the types of an {@link IndexedStorage}.
 */
export type IndexTypeCollection<T> = Record<string, IndexTypeDescription<keyof T>>;

// This is necessary to prevent infinite recursion in types
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

/**
 *  Object that represents a valid query starting from a specific type on an {@link IndexedStorage}.
 *  The keys of the object need to be one or more keys from the starting type,
 *  with the values being corresponding valid values of an object of that type.
 *  If the value definition of a key is one that contains the identifier of a different type,
 *  the value in the query can also be a nested object that has the same IndexedQuery requirements for that type.
 *  This can be done recursively.
 *
 *  E.g., if the storage has the following definition:
 *```ts
 *  {
 *    account: {},
 *    pod: { baseUrl: 'string', account: 'id:account' },
 *    pod: { owner: 'string', pod: 'id:pod' },
 *  }
 *```
 * A valid query on the `pod` type could be `{ pod: '123456' }`,
 * but also `{ pod: { baseUrl: 'http://example.com/pod/', account: { id: '789' }}}`.
 */
export type IndexedQuery<T extends IndexTypeCollection<T>, TType extends keyof T, TDepth extends number = 10> =
  [TDepth] extends [never] ? never :
      {[K in keyof T[TType] | typeof INDEX_ID_KEY]?:
        ValueType<T[TType][K]> |
        (T[TType][K] extends `${typeof INDEX_ID_KEY}:${infer U}` ? IndexedQuery<T, U, Prev[TDepth]> : never)
      };

/**
 * A storage solution that allows for more complex queries than a key/value storage
 * and allows setting indexes on specific keys.
 */
export interface IndexedStorage<T extends IndexTypeCollection<T>> {
  /**
   * Informs the storage of the definition of a specific type.
   * A definition is a key/value object with the values being a valid {@link ValueTypeDescription}.
   * Generally, this call needs to happen for every type of this storage,
   * and before any calls are made to interact with the data.
   *
   * @param type - The type to define.
   * @param description - A description of the values stored in objects of that type.
   */
  defineType: <TType extends StringKey<T>>(type: TType, description: T[TType]) => Promise<void>;

  /**
   * Creates an index on a key of the given type, to allow for better queries involving those keys.
   * Similar to {@link IndexedStorage.defineType} these calls need to happen first.
   *
   * @param type - The type to create an index on.
   * @param key - The key of that type to create an index on.
   */
  createIndex: <TType extends StringKey<T>>(type: TType, key: StringKey<T[TType]>) => Promise<void>;

  /**
   * Creates an object of the given type.
   * The storage will generate an identifier for the newly created object.
   *
   * @param type - The type to create.
   * @param value - The value to set for the created object.
   *
   * @returns A representation of the newly created object, including its new identifier.
   */
  create: <TType extends StringKey<T>>(type: TType, value: CreateTypeObject<T[TType]>) => Promise<TypeObject<T[TType]>>;

  /**
   * Returns `true` if the object of the given type with the given identifier exists.
   *
   * @param type - The type of object to get.
   * @param id - The identifier of that object.
   *
   * @returns Whether this object exists.
   */
  has: <TType extends StringKey<T>>(type: TType, id: string) => Promise<boolean>;

  /**
   * Returns the object of the given type with the given identifier.
   *
   * @param type - The type of object to get.
   * @param id - The identifier of that object.
   *
   * @returns A representation of the object, or `undefined` if there is no object of that type with that identifier.
   */
  get: <TType extends StringKey<T>>(type: TType, id: string) => Promise<TypeObject<T[TType]> | undefined>;

  /**
   * Finds all objects matching a specific {@link IndexedQuery}.
   *
   * @param type - The type of objects to find.
   * @param query - The query to execute.
   *
   * @returns A list of objects matching the query.
   */
  find: <TType extends StringKey<T>>(type: TType, query: IndexedQuery<T, TType>) => Promise<(TypeObject<T[TType]>)[]>;

  /**
   * Similar to {@link IndexedStorage.find}, but only returns the identifiers of the found objects.
   *
   * @param type - The type of objects to find.
   * @param query - The query to execute.
   *
   * @returns A list of identifiers of the matching objects.
   */
  findIds: <TType extends StringKey<T>>(type: TType, query: IndexedQuery<T, TType>) => Promise<string[]>;

  /**
   * Sets the value of a specific object.
   * The identifier in the object is used to identify the object.
   *
   * @param type - The type of the object to set.
   * @param value - The new value for the object.
   */
  set: <TType extends StringKey<T>>(type: TType, value: TypeObject<T[TType]>) => Promise<void>;

  /**
   * Sets the value of one specific field in an object.
   *
   * @param type - The type of the object to update.
   * @param id - The identifier of the object to update.
   * @param key - The key to update.
   * @param value - The new value for the given key.
   */
  setField: <TType extends StringKey<T>, TKey extends StringKey<T[TType]>>(
    type: TType, id: string, key: TKey, value: ValueType<T[TType][TKey]>) => Promise<void>;

  /**
   * Deletes the given object.
   * This will also delete all objects that reference that object if the corresponding key is not optional.
   *
   * @param type - The type of the object to delete.
   * @param id - The identifier of the object.
   */
  delete: <TType extends StringKey<T>>(type: TType, id: string) => Promise<void>;

  /**
   * Returns an iterator over all objects of the given type.
   *
   * @param type - The type to iterate over.
   */
  entries: <TType extends StringKey<T>>(type: TType) => AsyncIterableIterator<TypeObject<T[TType]>>;
}
