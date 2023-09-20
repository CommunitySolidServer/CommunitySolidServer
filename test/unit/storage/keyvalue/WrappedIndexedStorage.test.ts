import { INDEX_ID_KEY } from '../../../../src/storage/keyvalue/IndexedStorage';
import type { TypeObject } from '../../../../src/storage/keyvalue/IndexedStorage';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { WrappedIndexedStorage } from '../../../../src/storage/keyvalue/WrappedIndexedStorage';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

const dummyDescription = {
  root: { required: 'number', optional: 'string?', notIndexed: 'number' },
  child: { parent: 'id:root', name: 'string', notIndexed: 'number' },
  grandchild: { parent: 'id:child', bool: 'boolean', notIndexed: 'number' },
  otherChild: { parent: 'id:root', name: 'string', notIndexed: 'number' },
} as const;

describe('A WrappedIndexedStorage', (): void => {
  let valueMap: Map<string, any>;
  let valueStorage: jest.Mocked<KeyValueStorage<string, any>>;
  let indexMap: Map<string, string[]>;
  let indexStorage: jest.Mocked<KeyValueStorage<string, string[]>>;
  let storage: WrappedIndexedStorage<typeof dummyDescription>;

  beforeEach(async(): Promise<void> => {
    valueMap = new Map();
    valueStorage = {
      has: jest.fn(async(key): Promise<boolean> => valueMap.has(key)),
      get: jest.fn(async(key): Promise<unknown> => valueMap.get(key)),
      set: jest.fn(async(key, value): Promise<any> => valueMap.set(key, value)),
      delete: jest.fn(async(key): Promise<boolean> => valueMap.delete(key)),
      entries: jest.fn(async function* (): AsyncIterableIterator<[string, unknown]> {
        yield* valueMap.entries();
      }),
    };

    indexMap = new Map();
    indexStorage = {
      has: jest.fn(async(key): Promise<boolean> => indexMap.has(key)),
      get: jest.fn(async(key): Promise<string[] | undefined> => indexMap.get(key)),
      set: jest.fn(async(key, value): Promise<any> => indexMap.set(key, value)),
      delete: jest.fn(async(key): Promise<boolean> => indexMap.delete(key)),
      entries: jest.fn(async function* (): AsyncIterableIterator<[string, string[]]> {
        yield* indexMap.entries();
      }),
    };

    storage = new WrappedIndexedStorage<typeof dummyDescription>(valueStorage, indexStorage);
  });

  describe('that is empty', (): void => {
    it('can define and initialize data.', async(): Promise<void> => {
      await expect(storage.defineType('root', dummyDescription.root)).resolves.toBeUndefined();
      await expect(storage.defineType('child', dummyDescription.child)).resolves.toBeUndefined();
      await expect(storage.defineType('grandchild', dummyDescription.grandchild)).resolves.toBeUndefined();
      await expect(storage.defineType('otherChild', dummyDescription.otherChild)).resolves.toBeUndefined();
    });

    it('errors when defining types with multiple references.', async(): Promise<void> => {
      await expect(storage.defineType('root', { ref1: 'id:Type1', ref2: 'id:Type2' } as any))
        .rejects.toThrow(InternalServerError);
    });

    it('errors when defining types with optional references.', async(): Promise<void> => {
      await expect(storage.defineType('root', { ref: 'id:Type1?' } as any)).rejects.toThrow(InternalServerError);
    });

    it('errors trying to create an index on an undefined type.', async(): Promise<void> => {
      await expect(storage.createIndex('root', 'required')).rejects.toThrow(InternalServerError);
    });

    it('errors trying to access data before its type was defined.', async(): Promise<void> => {
      await expect(storage.has('root', '???')).rejects.toThrow(InternalServerError);
    });

    it('errors if type definitions are added after validation.', async(): Promise<void> => {
      await expect(storage.defineType('root', dummyDescription.root)).resolves.toBeUndefined();
      // Trigger data validation
      await storage.has('root', '???');
      await expect(storage.defineType('root', dummyDescription.root)).rejects.toThrow(InternalServerError);
    });

    it('errors if the type definitions are cyclical.', async(): Promise<void> => {
      await expect(storage.defineType('root', { ...dummyDescription.root, invalidReference: 'id:grandchild' } as any))
        .resolves.toBeUndefined();
      await expect(storage.defineType('child', dummyDescription.child)).resolves.toBeUndefined();
      await expect(storage.defineType('grandchild', dummyDescription.grandchild)).resolves.toBeUndefined();

      // Trigger data validation
      await expect(storage.has('root', '???')).rejects.toThrow(InternalServerError);
    });

    it('errors if there are multiple root types.', async(): Promise<void> => {
      await expect(storage.defineType('root', dummyDescription.root)).resolves.toBeUndefined();
      await expect(storage.defineType('child', dummyDescription.root as any)).resolves.toBeUndefined();

      // Trigger data validation
      await expect(storage.has('root', '???')).rejects.toThrow(InternalServerError);
    });
  });

  describe('with data definitions', (): void => {
    beforeEach(async(): Promise<void> => {
      await storage.defineType('root', dummyDescription.root);
      await storage.defineType('child', dummyDescription.child);
      await storage.defineType('grandchild', dummyDescription.grandchild);
      await storage.defineType('otherChild', dummyDescription.otherChild);
    });

    it('can create new entries.', async(): Promise<void> => {
      const parent = await storage.create('root', { required: 5, notIndexed: 0 });
      expect(parent).toEqual({ id: expect.any(String), required: 5, notIndexed: 0 });
      const child = await storage.create('child', { name: 'child', parent: parent.id, notIndexed: 1 });
      expect(child).toEqual({ id: expect.any(String), name: 'child', parent: parent.id, notIndexed: 1 });
      const grandchild = await storage.create('grandchild', { bool: true, parent: child.id, notIndexed: 2 });
      expect(grandchild).toEqual({ id: expect.any(String), bool: true, parent: child.id, notIndexed: 2 });
      const otherChild = await storage.create('otherChild', { name: 'otherChild', parent: parent.id, notIndexed: 3 });
      expect(otherChild).toEqual({ id: expect.any(String), name: 'otherChild', parent: parent.id, notIndexed: 3 });
    });

    it('errors when creating new entries with unknown references.', async(): Promise<void> => {
      await expect(storage.create('child', { name: 'child', parent: '???', notIndexed: 1 }))
        .rejects.toThrow(NotFoundHttpError);
    });

    it('can create indexes.', async(): Promise<void> => {
      await expect(storage.createIndex('root', 'required')).resolves.toBeUndefined();
      await expect(storage.createIndex('root', 'optional')).resolves.toBeUndefined();
      await expect(storage.createIndex('child', 'name')).resolves.toBeUndefined();
      await expect(storage.createIndex('grandchild', 'bool')).resolves.toBeUndefined();
      await expect(storage.createIndex('otherChild', 'name')).resolves.toBeUndefined();

      // This one does nothing
      await expect(storage.createIndex('grandchild', 'parent')).resolves.toBeUndefined();
    });
  });

  describe('with initialized data', (): void => {
    let root: TypeObject<typeof dummyDescription.root>;
    let root2: TypeObject<typeof dummyDescription.root>;
    let child: TypeObject<typeof dummyDescription.child>;
    let child2: TypeObject<typeof dummyDescription.child>;
    let child3: TypeObject<typeof dummyDescription.child>;
    let grandchild: TypeObject<typeof dummyDescription.grandchild>;
    let grandchild2: TypeObject<typeof dummyDescription.grandchild>;
    let grandchild3: TypeObject<typeof dummyDescription.grandchild>;
    let otherChild: TypeObject<typeof dummyDescription.otherChild>;

    beforeEach(async(): Promise<void> => {
      await storage.defineType('root', dummyDescription.root);
      await storage.defineType('child', dummyDescription.child);
      await storage.defineType('grandchild', dummyDescription.grandchild);
      await storage.defineType('otherChild', dummyDescription.otherChild);

      await storage.createIndex('root', 'required');
      await storage.createIndex('root', 'optional');
      await storage.createIndex('child', 'name');
      await storage.createIndex('grandchild', 'bool');
      await storage.createIndex('otherChild', 'name');

      root = await storage.create('root', { required: 5, notIndexed: 0 });
      child = await storage.create('child', { name: 'child', parent: root.id, notIndexed: 1 });
      grandchild = await storage.create('grandchild', { bool: true, parent: child.id, notIndexed: 2 });
      otherChild = await storage.create('otherChild', { name: 'otherChild', parent: root.id, notIndexed: 3 });

      // Extra resources for query tests
      root2 = await storage.create('root', { required: 5, optional: 'defined', notIndexed: 1 });
      child2 = await storage.create('child', { name: 'child2', parent: root.id, notIndexed: 1 });
      child3 = await storage.create('child', { name: 'child', parent: root2.id, notIndexed: 1 });
      grandchild2 = await storage.create('grandchild', { bool: false, parent: child.id, notIndexed: 2 });
      grandchild3 = await storage.create('grandchild', { bool: true, parent: child2.id, notIndexed: 2 });
    });

    it('can verify existence.', async(): Promise<void> => {
      await expect(storage.has('root', root.id)).resolves.toBe(true);
      await expect(storage.has('child', child.id)).resolves.toBe(true);
      await expect(storage.has('grandchild', grandchild.id)).resolves.toBe(true);
      await expect(storage.has('otherChild', otherChild.id)).resolves.toBe(true);

      await expect(storage.has('root', '???')).resolves.toBe(false);
      await expect(storage.has('child', '???')).resolves.toBe(false);
    });

    it('can return data.', async(): Promise<void> => {
      await expect(storage.get('root', root.id)).resolves.toEqual(root);
      await expect(storage.get('child', child.id)).resolves.toEqual(child);
      await expect(storage.get('grandchild', grandchild.id)).resolves.toEqual(grandchild);
      await expect(storage.get('otherChild', otherChild.id)).resolves.toEqual(otherChild);
    });

    it('returns undefined if there is no match.', async(): Promise<void> => {
      await expect(storage.get('root', child.id)).resolves.toBeUndefined();
      await expect(storage.get('child', root.id)).resolves.toBeUndefined();
      await expect(storage.get('grandchild', otherChild.id)).resolves.toBeUndefined();
      await expect(storage.get('otherChild', grandchild.id)).resolves.toBeUndefined();
    });

    it('can update entries.', async(): Promise<void> => {
      await expect(storage.set('root', { [INDEX_ID_KEY]: root.id, required: -10, notIndexed: -1 }))
        .resolves.toBeUndefined();
      await expect(storage.get('root', root.id))
        .resolves.toEqual({ [INDEX_ID_KEY]: root.id, required: -10, notIndexed: -1 });

      await expect(storage.set('child', { ...child, name: 'newChild', notIndexed: -2 })).resolves.toBeUndefined();
      await expect(storage.get('child', child.id)).resolves.toEqual({ ...child, name: 'newChild', notIndexed: -2 });

      await expect(storage.set('grandchild', { ...grandchild, bool: false, notIndexed: -3 })).resolves.toBeUndefined();
      await expect(storage.get('grandchild', grandchild.id))
        .resolves.toEqual({ ...grandchild, bool: false, notIndexed: -3 });

      await expect(storage.set('otherChild', { ...otherChild, name: 'newOtherChild', notIndexed: -4 }))
        .resolves.toBeUndefined();
      await expect(storage.get('otherChild', otherChild.id))
        .resolves.toEqual({ ...otherChild, name: 'newOtherChild', notIndexed: -4 });
    });

    it('errors when trying to update unknown entries.', async(): Promise<void> => {
      await expect(storage.set('root', { [INDEX_ID_KEY]: '???', required: -10, notIndexed: -1 }))
        .rejects.toThrow(NotFoundHttpError);
      await expect(storage.set('child', { ...child, [INDEX_ID_KEY]: '???' }))
        .rejects.toThrow(NotFoundHttpError);
    });

    it('errors when trying to update references.', async(): Promise<void> => {
      await expect(storage.set('child', { ...child, parent: 'somewhereElse' }))
        .rejects.toThrow(NotImplementedHttpError);
    });

    it('can update specific fields.', async(): Promise<void> => {
      await expect(storage.setField('root', root.id, 'notIndexed', -1))
        .resolves.toBeUndefined();
      await expect(storage.get('root', root.id))
        .resolves.toEqual({ ...root, notIndexed: -1 });

      await expect(storage.setField('child', child.id, 'notIndexed', -2))
        .resolves.toBeUndefined();
      await expect(storage.get('child', child.id))
        .resolves.toEqual({ ...child, notIndexed: -2 });

      await expect(storage.setField('grandchild', grandchild.id, 'notIndexed', -2))
        .resolves.toBeUndefined();
      await expect(storage.get('grandchild', grandchild.id))
        .resolves.toEqual({ ...grandchild, notIndexed: -2 });

      await expect(storage.setField('otherChild', otherChild.id, 'notIndexed', -3))
        .resolves.toBeUndefined();
      await expect(storage.get('otherChild', otherChild.id))
        .resolves.toEqual({ ...otherChild, notIndexed: -3 });
    });

    it('errors when trying to update a field in unknown entries.', async(): Promise<void> => {
      await expect(storage.setField('root', '???', 'notIndexed', -1))
        .rejects.toThrow(NotFoundHttpError);
      await expect(storage.setField('child', '???', 'notIndexed', -1))
        .rejects.toThrow(NotFoundHttpError);
    });

    it('errors when trying to update a reference field.', async(): Promise<void> => {
      await expect(storage.setField('child', child.id, 'parent', 'somewhereElse'))
        .rejects.toThrow(NotImplementedHttpError);
    });

    it('can remove resource.', async(): Promise<void> => {
      await expect(storage.delete('otherChild', otherChild.id)).resolves.toBeUndefined();
      await expect(storage.get('otherChild', otherChild.id)).resolves.toBeUndefined();
      await expect(storage.delete('grandchild', grandchild.id)).resolves.toBeUndefined();
      await expect(storage.get('grandchild', grandchild.id)).resolves.toBeUndefined();
      await expect(storage.delete('child', child.id)).resolves.toBeUndefined();
      await expect(storage.get('child', child.id)).resolves.toBeUndefined();
      await expect(storage.delete('root', root.id)).resolves.toBeUndefined();
      await expect(storage.get('root', root.id)).resolves.toBeUndefined();
    });

    it('does nothing when removing a resource that does not exist.', async(): Promise<void> => {
      await expect(storage.delete('otherChild', otherChild.id)).resolves.toBeUndefined();
      await expect(storage.delete('otherChild', otherChild.id)).resolves.toBeUndefined();

      await expect(storage.delete('root', root.id)).resolves.toBeUndefined();
      await expect(storage.delete('root', root.id)).resolves.toBeUndefined();
    });

    it('removes all dependent resources when deleting.', async(): Promise<void> => {
      await expect(storage.delete('child', child.id)).resolves.toBeUndefined();
      await expect(storage.get('grandchild', grandchild.id)).resolves.toBeUndefined();
      await expect(storage.get('otherChild', otherChild.id)).resolves.toEqual(otherChild);

      await expect(storage.delete('root', root.id)).resolves.toBeUndefined();
      await expect(storage.get('otherChild', otherChild.id)).resolves.toBeUndefined();
    });

    it('can find objects using queries.', async(): Promise<void> => {
      await expect(storage.find('root', { required: 5 })).resolves.toEqual([ root, root2 ]);
      await expect(storage.find('root', { required: 5, notIndexed: 0 })).resolves.toEqual([ root ]);
      await expect(storage.find('root', { optional: 'defined' })).resolves.toEqual([ root2 ]);
      await expect(storage.find('root', { required: 5, optional: undefined })).resolves.toEqual([ root ]);

      await expect(storage.find('child', { parent: root[INDEX_ID_KEY] })).resolves.toEqual([ child, child2 ]);
      await expect(storage.find('child', { parent: root[INDEX_ID_KEY], name: 'child' })).resolves.toEqual([ child ]);
      await expect(storage.find('child', { parent: root[INDEX_ID_KEY], name: 'child2' })).resolves.toEqual([ child2 ]);
      await expect(storage.find('child', { name: 'child' })).resolves.toEqual([ child, child3 ]);
      await expect(storage.find('child', { parent: { [INDEX_ID_KEY]: root[INDEX_ID_KEY] }, name: 'child0' }))
        .resolves.toEqual([]);

      await expect(storage.find('grandchild', { parent: child[INDEX_ID_KEY] }))
        .resolves.toEqual([ grandchild, grandchild2 ]);
      await expect(storage.find('grandchild', { parent: child2[INDEX_ID_KEY] }))
        .resolves.toEqual([ grandchild3 ]);
      await expect(storage.find('grandchild', { bool: true }))
        .resolves.toEqual([ grandchild, grandchild3 ]);
    });

    it('can perform nested queries.', async(): Promise<void> => {
      await expect(storage.find('grandchild', { parent: { name: 'child' }}))
        .resolves.toEqual([ grandchild, grandchild2 ]);
      await expect(storage.find('grandchild', { bool: true, parent: { notIndexed: 1 }}))
        .resolves.toEqual([ grandchild, grandchild3 ]);
      await expect(storage.find('grandchild', { bool: true, parent: { parent: { required: 5 }}}))
        .resolves.toEqual([ grandchild, grandchild3 ]);
    });

    it('can also find just the IDs of the results.', async(): Promise<void> => {
      await expect(storage.findIds('root', { required: 5 }))
        .resolves.toEqual([ root[INDEX_ID_KEY], root2[INDEX_ID_KEY] ]);
      await expect(storage.findIds('child', { name: 'child' }))
        .resolves.toEqual([ child[INDEX_ID_KEY], child3[INDEX_ID_KEY] ]);
    });

    it('requires at least one index when finding results.', async(): Promise<void> => {
      await expect(storage.findIds('root', { notIndexed: 0 })).rejects.toThrow(InternalServerError);
      await expect(storage.findIds('root', { optional: undefined })).rejects.toThrow(InternalServerError);
      await expect(storage.findIds('child', { notIndexed: 0 })).rejects.toThrow(InternalServerError);
      await expect(storage.findIds('grandchild', { notIndexed: 0 })).rejects.toThrow(InternalServerError);
      await expect(storage.findIds('otherChild', { notIndexed: 0 })).rejects.toThrow(InternalServerError);
    });

    it('can iterate over all entries of a type.', async(): Promise<void> => {
      const roots: unknown[] = [];
      for await (const entry of storage.entries('root')) {
        roots.push(entry);
      }
      expect(roots).toEqual([ root, root2 ]);

      const children: unknown[] = [];
      for await (const entry of storage.entries('child')) {
        children.push(entry);
      }
      expect(children).toEqual([ child, child2, child3 ]);
    });

    it('errors if there is index corruption.', async(): Promise<void> => {
      // Corrupt the index. Will break if we change how index keys get generated.
      indexMap.set(`child/${child.id}`, [ root2.id ]);
      await expect(storage.create('grandchild', { bool: false, notIndexed: 5, parent: child.id }))
        .rejects.toThrow(InternalServerError);
    });

    it('ignores index corruption when deleting keys.', async(): Promise<void> => {
      // Corrupt the index. Will break if we change how index keys get generated.
      indexMap.delete(`child/name/${child.name}`);
      await expect(storage.delete('child', child.id)).resolves.toBeUndefined();
    });
  });
});
