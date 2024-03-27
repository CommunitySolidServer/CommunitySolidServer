import { v4 } from 'uuid';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { INDEX_ID_KEY } from './IndexedStorage';
import type {
  CreateTypeObject,
  IndexedQuery,
  IndexedStorage,
  IndexTypeCollection,
  StringKey,
  TypeObject,
  ValueType,
} from './IndexedStorage';
import type { KeyValueStorage } from './KeyValueStorage';

/**
 * Key used to link to child objects in a {@link WrappedIndexedStorage}.
 */
export type VirtualKey<TChild> = TChild extends string ? `**${TChild}**` : never;

/**
 * Object stored in the wrapped {@link KeyValueStorage} in a {@link WrappedIndexedStorage}.
 */
export type VirtualObject = {
  [key: VirtualKey<string>]: Record<string, VirtualObject>;
  [key: string]: unknown;
  [INDEX_ID_KEY]: string;
};

/**
 * A parent/child relation description in a {@link WrappedIndexedStorage}.
 */
export type IndexRelation<TTypes> = {
  parent: { key: VirtualKey<string>; type: StringKey<TTypes> };
  child: { key: string; type: StringKey<TTypes> };
};

/**
 * An {@link IndexedStorage} that makes use of 2 {@link KeyValueStorage}s to implement the interface.
 * Due to being limited by key/value storages, there are some restrictions on the allowed type definitions:
 *
 *   * There needs to be exactly 1 type with no references to other types.
 *   * All other types need to have exactly 1 reference to another type.
 *   * Types can't reference each other to create a cycle of references.
 *
 * All of the above to create a tree-like structure of references.
 * Such a tree is then stored in one of the storages.
 * The other storage is used to store all indexes that are used to find the correct tree object when solving queries.
 */
export class WrappedIndexedStorage<T extends IndexTypeCollection<T>> implements IndexedStorage<T> {
  protected readonly logger = getLoggerFor(this);

  private readonly valueStorage: KeyValueStorage<string, VirtualObject>;
  private readonly indexStorage: KeyValueStorage<string, string[]>;

  /**
   * For every type, the keys on which an index tracks the values and which root object they are contained in.
   * All types for which a `defineType` call was made will have a key in this object.
   * For all types that are not the root, there will always be an index on their ID value.
   */
  private readonly indexes: {[K in StringKey<T>]?: Set<StringKey<T[K]>> };

  /**
   * Keeps track of type validation.
   * If true the defined types create a valid structure that can be used.
   */
  private validDefinition = false;

  /**
   * The variable in which the root type is stored.
   * A separate getter is used to always return the value
   * so the potential `undefined` does not have to be taken into account.
   */
  private rootTypeVar: StringKey<T> | undefined;

  /**
   * All parent/child relations between all types in the storage,
   * including the keys in both types that are used to reference each other.
   */
  private readonly relations: IndexRelation<T>[];

  public constructor(
    valueStorage: KeyValueStorage<string, VirtualObject>,
    indexStorage: KeyValueStorage<string, string[]>,
  ) {
    this.valueStorage = valueStorage;
    this.indexStorage = indexStorage;
    this.indexes = {};
    this.relations = [];
  }

  public async defineType<TType extends StringKey<T>>(type: TType, description: T[TType]): Promise<void> {
    if (this.rootTypeVar) {
      this.logger.error(`Trying to define new type "${type}" after types were already validated.`);
      throw new InternalServerError(`Trying to define new type "${type}" after types were already validated.`);
    }

    this.validDefinition = false;
    let hasParentKey = false;
    for (const [ key, desc ] of Object.entries(description)) {
      if (desc.startsWith(`${INDEX_ID_KEY}:`)) {
        if (hasParentKey) {
          this.logger.error(`Type definition of ${type} has multiple references, only 1 is allowed.`);
          throw new InternalServerError(`Type definition of ${type} has multiple references, only 1 is allowed.`);
        }
        if (desc.endsWith('?')) {
          this.logger.error(`Type definition of ${type} has optional references, which is not allowed.`);
          throw new InternalServerError(`Type definition of ${type} has optional references, which is not allowed.`);
        }
        hasParentKey = true;
        this.relations.push({ parent: { type: desc.slice(3), key: `**${type}**` }, child: { type, key }});
      }
    }
    this.indexes[type] = new Set([ INDEX_ID_KEY ]);
  }

  public async createIndex<TType extends StringKey<T>>(type: TType, key: StringKey<T[TType]>): Promise<void> {
    // An index on the key targeting the parent is the same as having an index on the identifier of that parent.
    // Such an index gets created automatically when the type is defined so this can now be ignored.
    if (key === this.getParentRelation(type)?.child.key) {
      return;
    }
    const typeIndexes = this.indexes[type];
    if (!typeIndexes) {
      this.logger.error(`Trying to create index on key ${key} of undefined type ${type}`);
      throw new InternalServerError(`Trying to create index on key ${key} of undefined type ${type}`);
    }
    typeIndexes.add(key);
  }

  public async has<TType extends StringKey<T>>(type: TType, id: string): Promise<boolean> {
    this.validateDefinition(type);
    if (type === this.rootType) {
      return this.valueStorage.has(id);
    }
    const result = await this.find(type, { [INDEX_ID_KEY]: id } as IndexedQuery<T, TType>);
    return result.length > 0;
  }

  public async get<TType extends StringKey<T>>(type: TType, id: string): Promise<TypeObject<T[TType]> | undefined> {
    this.validateDefinition(type);
    const result = await this.find(type, { [INDEX_ID_KEY]: id } as IndexedQuery<T, TType>);
    if (result.length === 0) {
      return;
    }
    return result[0];
  }

  public async create<TType extends StringKey<T>>(type: TType, value: CreateTypeObject<T[TType]>):
  Promise<TypeObject<T[TType]>> {
    this.validateDefinition(type);
    const id = v4();
    const newObj = { ...value, [INDEX_ID_KEY]: id } as unknown as VirtualObject;
    // Add the virtual keys
    for (const relation of this.getChildRelations(type)) {
      newObj[relation.parent.key] = {};
    }

    const relation = this.getParentRelation(type);

    // No parent relation implies that this is the root type
    if (!relation) {
      await this.valueStorage.set(id, newObj);
      await this.updateTypeIndex(type, id, undefined, newObj);
      return this.toTypeObject(type, newObj);
    }

    // We know this will be a string due to the typing requirements and how the relations object is built
    const parentId = newObj[relation.child.key] as string;
    const root = await this.getRoot(relation.parent.type, parentId);
    if (!root) {
      throw new NotFoundHttpError(`Unknown object of type ${relation.parent.type} with ID ${parentId}`);
    }
    const parentObj = relation.parent.type === this.rootType ?
      root :
      this.getContainingRecord(root, relation.parent.type, parentId)[parentId];
    parentObj[relation.parent.key][id] = newObj;

    await this.valueStorage.set(root[INDEX_ID_KEY], root);
    await this.updateTypeIndex(type, root[INDEX_ID_KEY], undefined, newObj);

    return this.toTypeObject(type, newObj);
  }

  public async set<TType extends StringKey<T>>(type: TType, value: TypeObject<T[TType]>): Promise<void> {
    this.validateDefinition(type);
    return this.updateValue(type, value, true);
  }

  public async setField<TType extends StringKey<T>, TKey extends StringKey<T[TType]>>(
    type: TType,
    id: string,
    key: TKey,
    value: ValueType<T[TType][TKey]>,
  ): Promise<void> {
    this.validateDefinition(type);
    return this.updateValue(
      type,
      { [INDEX_ID_KEY]: id, [key]: value } as Partial<TypeObject<T[TType]>> & { [INDEX_ID_KEY]: string },
      false,
    );
  }

  public async delete<TType extends StringKey<T>>(type: TType, id: string): Promise<void> {
    this.validateDefinition(type);
    const root = await this.getRoot(type, id);
    if (!root) {
      return;
    }

    let oldObj: VirtualObject;
    if (type === this.rootType) {
      oldObj = root;
      await this.valueStorage.delete(id);
    } else {
      const objs = this.getContainingRecord(root, type, id);
      oldObj = objs[id];
      delete objs[id];
      await this.valueStorage.set(root[INDEX_ID_KEY], root);
    }

    // Updating index of removed type and all children as those are also gone
    await this.updateDeepTypeIndex(type, root[INDEX_ID_KEY], oldObj);
  }

  public async findIds<TType extends StringKey<T>>(type: TType, query: IndexedQuery<T, TType>): Promise<string[]> {
    this.validateDefinition(type);
    if (type === this.rootType) {
      // Root IDs are the only ones we can get more efficiently.
      // For all other types we have to find the full objects anyway.
      const indexedRoots = await this.findIndexedRoots(type, query);
      if (!Array.isArray(indexedRoots)) {
        this.logger.error(`Attempting to execute query without index: ${JSON.stringify(query)}`);
        throw new InternalServerError(`Attempting to execute query without index: ${JSON.stringify(query)}`);
      }
      return indexedRoots;
    }
    return (await this.solveQuery(type, query)).map((result): string => result.id);
  }

  public async find<TType extends StringKey<T>>(type: TType, query: IndexedQuery<T, TType>):
  Promise<(TypeObject<T[TType]>)[]> {
    this.validateDefinition(type);
    return (await this.solveQuery(type, query)).map((result): TypeObject<T[TType]> => this.toTypeObject(type, result));
  }

  public async* entries<TType extends StringKey<T>>(type: TType): AsyncIterableIterator<TypeObject<T[TType]>> {
    this.validateDefinition(type);
    const path = this.getPathToType(type);
    for await (const [ , root ] of this.valueStorage.entries()) {
      const children = this.getChildObjects(root, path);
      yield* children.map((child): TypeObject<T[TType]> => this.toTypeObject(type, child));
    }
  }

  // --------------------------------- OUTPUT HELPERS ---------------------------------

  /**
   * Converts a {@link VirtualObject} into a {@link TypeObject}.
   * To be used when outputting results.
   */
  protected toTypeObject<TType extends StringKey<T>>(type: TType, obj: VirtualObject): TypeObject<T[TType]> {
    const result = { ...obj };
    for (const relation of this.getChildRelations(type)) {
      delete result[relation.parent.key];
    }
    return result as unknown as TypeObject<T[TType]>;
  }

  // --------------------------------- ROOT HELPERS ---------------------------------

  /**
   * The root type for this storage.
   * Use this instead of rootTypeVar to prevent having to check for `undefined`.
   * This value will always be defined if the type definitions have been validated.
   */
  protected get rootType(): string {
    return this.rootTypeVar!;
  }

  /**
   * Finds the root object that contains the requested type/id combination.
   */
  protected async getRoot<TType extends StringKey<T>>(type: TType, id: string): Promise<VirtualObject | undefined> {
    let rootId: string;
    if (type === this.rootType) {
      rootId = id;
    } else {
      // We know there always is an index on the identifier key
      const indexKey = this.getIndexKey(type, INDEX_ID_KEY, id);
      const indexResult = await this.indexStorage.get(indexKey);
      if (!indexResult || indexResult.length !== 1) {
        return;
      }
      rootId = indexResult[0];
    }
    return this.valueStorage.get(rootId);
  }

  // --------------------------------- PATH HELPERS ---------------------------------

  /**
   * Returns the sequence of virtual keys that need to be accessed to reach the given type, starting from the root.
   */
  protected getPathToType(type: string): VirtualKey<string>[] {
    const result: VirtualKey<string>[] = [];
    let relation = this.getParentRelation(type);
    while (relation) {
      result.unshift(relation.parent.key);
      relation = this.getParentRelation(relation.parent.type);
    }
    return result;
  }

  /**
   * Finds all records that can be found in the given object by following the given path of virtual keys.
   */
  protected getPathRecords(obj: VirtualObject, path: VirtualKey<string>[]): Record<string, VirtualObject>[] {
    const record = obj[path[0]];
    if (path.length === 1) {
      return [ record ];
    }
    const subPath = path.slice(1);
    return Object.values(record)
      .flatMap((child): Record<string, VirtualObject>[] => this.getPathRecords(child, subPath));
  }

  /**
   * Finds all objects in the provided object that can be found by following the provided path of virtual keys.
   */
  protected getChildObjects(obj: VirtualObject, path: VirtualKey<string>[]): VirtualObject[] {
    if (path.length === 0) {
      return [ obj ];
    }
    return this.getPathRecords(obj, path).flatMap((record): VirtualObject[] => Object.values(record));
  }

  /**
   * Finds the record in the given object that contains the given type/id combination.
   * This function assumes it was already verified through an index that this object contains the given combination.
   */
  protected getContainingRecord<TType extends StringKey<T>>(rootObj: VirtualObject, type: TType, id: string):
  Record<string, VirtualObject> {
    const path = this.getPathToType(type);
    const records = this.getPathRecords(rootObj, path);
    const match = records.find((record): boolean => Boolean(record[id]));
    if (!match) {
      this.logger.error(`Could not find ${type} ${id} in ${this.rootType} ${rootObj.id}`);
      throw new InternalServerError(`Could not find ${type} ${id} in ${this.rootType} ${rootObj.id}`);
    }
    return match;
  }

  // --------------------------------- UPDATE VALUE HELPERS ---------------------------------

  /**
   * Replaces an object of the given type.
   * The identifier in the value is used to determine which object.
   */
  protected updateValue<TType extends StringKey<T>>(type: TType, value: TypeObject<T[TType]>, replace: true):
  Promise<void>;

  /**
   * Replaces part of an object of the given type with the given partial value.
   * The identifier in the value is used to determine which object.
   */
  protected updateValue<TType extends StringKey<T>>(type: TType,
    partial: Partial<TypeObject<T[TType]>> & { [INDEX_ID_KEY]: string }, replace: false): Promise<void>;

  protected async updateValue<TType extends StringKey<T>>(
    type: TType,
    partial: Partial<TypeObject<T[TType]>> & { [INDEX_ID_KEY]: string },
    replace: boolean,
  ): Promise<void> {
    const id = partial[INDEX_ID_KEY];
    let root = await this.getRoot(type, id);
    if (!root) {
      throw new NotFoundHttpError(`Unknown object of type ${type} with ID ${id}`);
    }

    let oldObj: VirtualObject;
    let newObj: VirtualObject;
    const relation = this.getParentRelation(type);
    if (relation) {
      const objs = this.getContainingRecord(root, type, id);
      if (partial[relation.child.key] && objs[id][relation.child.key] !== partial[relation.child.key]) {
        this.logger.error(
          `Trying to modify reference key ${objs[id][relation.child.key] as string} on "${type}" ${id}`,
        );
        throw new NotImplementedHttpError('Changing reference keys of existing objects is not supported.');
      }
      oldObj = objs[id];
      newObj = (replace ? { ...partial } : { ...oldObj, ...partial }) as VirtualObject;
      objs[id] = newObj;
    } else {
      oldObj = root;
      newObj = (replace ? { ...partial } : { ...oldObj, ...partial }) as VirtualObject;
      root = newObj;
    }

    // Copy over the child relations
    for (const childRelation of this.getChildRelations(type)) {
      newObj[childRelation.parent.key] = oldObj[childRelation.parent.key];
    }
    await this.valueStorage.set(root[INDEX_ID_KEY], root);
    await this.updateTypeIndex(type, root[INDEX_ID_KEY], oldObj, newObj);
  }

  // --------------------------------- TYPE HELPERS ---------------------------------

  /**
   * Returns all relations where the given type is the parent.
   */
  protected getChildRelations<TType extends StringKey<T>>(type: TType): IndexRelation<T>[] {
    return this.relations.filter((relation): boolean => relation.parent.type === type);
  }

  /**
   * Returns the relation where the given type is the child.
   * Will return `undefined` for the root type as that one doesn't have a parent.
   */
  protected getParentRelation<TType extends StringKey<T>>(type: TType): IndexRelation<T> | undefined {
    return this.relations.find((relation): boolean => relation.child.type === type);
  }

  /**
   * Makes sure the defined types fulfill all the requirements necessary for types on this storage.
   * Will throw an error if this is not the case.
   * This should be called before doing any data interactions.
   * Stores success in a variable so future calls are instantaneous.
   */
  protected validateDefinition(type: string): void {
    // We can't know if all types are already defined.
    // This prevents issues even if the other types together are valid.
    if (!this.indexes[type]) {
      const msg = `Type "${type}" was not defined. The defineType functions needs to be called before accessing data.`;
      this.logger.error(msg);
      throw new InternalServerError(msg);
    }

    if (this.validDefinition) {
      return;
    }

    const rootTypes = new Set<StringKey<T>>();
    // `this.indexes` will contain a key for each type as we always have an index on the identifier of a type
    for (let indexType of Object.keys(this.indexes)) {
      const foundTypes = new Set<string>([ indexType ]);
      // Find path to root from this type, thereby ensuring that there is no cycle.
      let relation = this.getParentRelation(indexType);
      while (relation) {
        indexType = relation.parent.type;
        if (foundTypes.has(indexType)) {
          const msg = `The following types cyclically reference each other: ${[ ...foundTypes ].join(', ')}`;
          this.logger.error(msg);
          throw new InternalServerError(msg);
        }
        foundTypes.add(indexType);
        relation = this.getParentRelation(indexType);
      }
      rootTypes.add(indexType);
    }

    if (rootTypes.size > 1) {
      const msg = `Only one type definition with no references is allowed. Found ${[ ...rootTypes ].join(', ')}`;
      this.logger.error(msg);
      throw new InternalServerError(msg);
    }

    this.rootTypeVar = [ ...rootTypes.values() ][0];

    // Remove the root index as we don't need it, and it can cause confusion when resolving queries
    this.indexes[this.rootTypeVar]?.delete(INDEX_ID_KEY);

    this.validDefinition = true;
  }

  // --------------------------------- QUERY HELPERS ---------------------------------

  /**
   * Finds the IDs of all root objects that contain objects of the given type matching the given query
   * by making use of the indexes applicable to the keys in the query.
   * This function only looks at the keys in the query with primitive values,
   * object values in the query referencing parent objects are not considered.
   * Similarly, only indexes are used, keys without index are also ignored.
   *
   * If an array of root IDs is provided as input,
   * the result will be an intersection of this array and the found identifiers.
   *
   * If the result is an empty array, it means that there is no valid identifier matching the query,
   * while an `undefined` result means there is no index matching any of the query keys,
   * so a result can't be determined.
   */
  protected async findIndexedRoots<TType extends StringKey<T>>(
    type: TType,
    match: IndexedQuery<T, TType>,
    rootIds?: string[],
  ): Promise<string[] | undefined> {
    if (type === this.rootType && match[INDEX_ID_KEY]) {
      // If the input is the root type with a known ID in the query,
      // and we have already established that it is not this ID,
      // there is no result.
      if (rootIds && !rootIds.includes(match[INDEX_ID_KEY] as string)) {
        return [];
      }
      rootIds = [ match[INDEX_ID_KEY] as string ];
    }

    const indexIds: string[] = [];
    for (const [ key, value ] of Object.entries(match)) {
      if (this.indexes[type]?.has(key) && typeof value !== 'undefined') {
        // We know value is a string (or boolean/number) since we can't have indexes on fields referencing other objects
        indexIds.push(this.getIndexKey(type, key, value as string));
      }
    }

    if (indexIds.length === 0) {
      return rootIds;
    }

    // Use all indexes found to find matching IDs
    const indexResults = await Promise.all(indexIds.map(async(id): Promise<string[]> =>
      await this.indexStorage.get(id) ?? []));
    if (Array.isArray(rootIds)) {
      indexResults.push(rootIds);
    }

    let indexedRoots: string[] = indexResults[0];
    for (const ids of indexResults.slice(1)) {
      indexedRoots = indexedRoots.filter((id): boolean => ids.includes(id));
    }
    return indexedRoots;
  }

  /**
   * Finds all objects of the given type matching the query.
   * The `rootIds` array can be used to restrict the IDs of root objects to look at,
   * which is relevant for the recursive calls the function does.
   *
   * Will throw an error if there is no index that can be used to solve the query.
   */
  protected async solveQuery<TType extends StringKey<T>>(
    type: TType,
    query: IndexedQuery<T, TType>,
    rootIds?: string[],
  ): Promise<VirtualObject[]> {
    this.logger.debug(`Executing "${type}" query ${JSON.stringify(query)}. Already found roots ${rootIds?.join(',')}.`);

    const indexedRoots = await this.findIndexedRoots(type, query, rootIds);

    // All objects of this type that we find through recursive calls
    let objs: VirtualObject[];

    // Either find all objects of the type from the found rootIds if the query is a leaf,
    // or recursively query the parent object if it is not.
    const relation = this.getParentRelation(type);
    if (!relation || !query[relation.child.key]) {
      // This is a leaf node of the query
      if (!Array.isArray(indexedRoots)) {
        this.logger.error(`Attempting to execute query without index: ${JSON.stringify(query)}`);
        throw new InternalServerError(`Attempting to execute query without index: ${JSON.stringify(query)}`);
      }
      const pathFromRoot = this.getPathToType(type);
      // All objects of this type for all root objects we have
      const roots = (await Promise.all(indexedRoots.map(async(id): Promise<VirtualObject | undefined> => {
        const root = await this.valueStorage.get(id);
        if (!root) {
          // Not throwing an error to sort of make server still work if an index is wrong.
          this.logger.error(
            `Data inconsistency: index contains ${this.rootType} with ID ${id}, but this object does not exist.`,
          );
        }
        return root;
      }))).filter((root): boolean => typeof root !== 'undefined') as VirtualObject[];
      objs = roots.flatMap((root): VirtualObject[] => this.getChildObjects(root, pathFromRoot));
    } else {
      const subQuery = (typeof query[relation.child.key] === 'string' ?
          { [INDEX_ID_KEY]: query[relation.child.key] } :
        query[relation.child.key]) as IndexedQuery<T, typeof relation.parent.type>;
      // All objects by recursively calling this function on the parent object and extracting all children of this type
      objs = (await this.solveQuery(relation.parent.type, subQuery, indexedRoots))
        .flatMap((parentObj): VirtualObject[] => Object.values(parentObj[relation.parent.key]));
    }

    // For all keys that were not handled recursively: make sure that it matches the found objects
    const remainingKeys = Object.keys(query).filter(
      (key): boolean => key !== relation?.child.key || typeof query[key] === 'string',
    );
    for (const key of remainingKeys) {
      objs = objs.filter((obj): boolean => obj[key] === query[key]);
    }
    return objs;
  }

  // --------------------------------- INDEX HELPERS ---------------------------------

  /**
   * Generate the key used to store the index in the index storage.
   */
  protected getIndexKey(type: string, key: string, value: string | number): string {
    return `${encodeURIComponent(type)}/${key === INDEX_ID_KEY ? '' : `${key}/`}${encodeURIComponent(`${value}`)}`;
  }

  /**
   * Update all indexes for an object of the given type, and all its children.
   */
  protected async updateDeepTypeIndex<TType extends StringKey<T>>(
    type: TType,
    rootId: string,
    oldObj: VirtualObject,
    newObj?: VirtualObject,
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    promises.push(this.updateTypeIndex(type, rootId, oldObj, newObj));

    for (const { parent, child } of this.getChildRelations(type)) {
      const oldRecord: Record<string, VirtualObject> = oldObj[parent.key];
      const newRecord: Record<string, VirtualObject> = newObj?.[parent.key] ?? {};
      const uniqueKeys = new Set([ ...Object.keys(oldRecord), ...Object.keys(newRecord) ]);
      for (const key of uniqueKeys) {
        promises.push(this.updateDeepTypeIndex(child.type, rootId, oldRecord[key], newRecord[key]));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Updates all indexes for an object of the given type.
   */
  protected async updateTypeIndex<TType extends StringKey<T>>(
    type: TType,
    rootId: string,
    oldObj?: VirtualObject,
    newObj?: VirtualObject,
  ): Promise<void> {
    const added: { key: string; value: string }[] = [];
    const removed: { key: string; value: string }[] = [];

    for (const key of this.indexes[type]!) {
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];
      if (oldValue !== newValue) {
        if (typeof oldValue !== 'undefined') {
          removed.push({ key, value: oldValue as string });
        }
        if (typeof newValue !== 'undefined') {
          added.push({ key, value: newValue as string });
        }
      }
    }

    await Promise.all([
      ...added.map(async({ key, value }): Promise<unknown> => this.updateKeyIndex(type, key, value, rootId, true)),
      ...removed.map(async({ key, value }): Promise<unknown> => this.updateKeyIndex(type, key, value, rootId, false)),
    ]);
  }

  /**
   * Updates the index for a specific key of an object of the given type.
   */
  protected async updateKeyIndex(type: string, key: string, value: string, rootId: string, add: boolean):
  Promise<void> {
    const indexKey = this.getIndexKey(type, key, value);
    const indexValues = await this.indexStorage.get(indexKey) ?? [];
    this.logger.debug(
      `Updating index ${indexKey} by ${add ? 'adding' : 'removing'} ${rootId} from ${indexValues.join(',')}`,
    );

    if (add) {
      if (!indexValues.includes(rootId)) {
        indexValues.push(rootId);
      }
      await this.indexStorage.set(indexKey, indexValues);
    } else {
      const updatedValues = indexValues.filter((val): boolean => val !== rootId);
      await (updatedValues.length === 0 ?
        this.indexStorage.delete(indexKey) :
        this.indexStorage.set(indexKey, updatedValues));
    }
  }
}
