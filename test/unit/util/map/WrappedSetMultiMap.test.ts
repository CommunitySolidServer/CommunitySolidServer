import { WrappedSetMultiMap } from '../../../../src/util/map/WrappedSetMultiMap';

describe('A WrappedSetMultiMap', (): void => {
  const key = 'key';
  let map: WrappedSetMultiMap<string, number>;

  beforeEach(async(): Promise<void> => {
    map = new WrappedSetMultiMap();
  });

  it('can set values and check their existence.', async(): Promise<void> => {
    expect(map.set(key, 123)).toBe(map);
    expect(map.has(key)).toBe(true);
    expect(map.hasEntry(key, 123)).toBe(true);
    expect(map.get(key)).toEqual(new Set([ 123 ]));
    expect(map.size).toBe(1);
  });

  it('can set multiple values simultaneously.', async(): Promise<void> => {
    expect(map.set(key, new Set([ 123, 456, 789 ]))).toBe(map);
    expect(map.has(key)).toBe(true);
    expect(map.hasEntry(key, 123)).toBe(true);
    expect(map.hasEntry(key, 456)).toBe(true);
    expect(map.hasEntry(key, 789)).toBe(true);
    expect(map.get(key)).toEqual(new Set([ 123, 456, 789 ]));
    expect(map.size).toBe(3);
  });

  it('overwrites values when setting them.', async(): Promise<void> => {
    expect(map.set(key, new Set([ 123, 456 ]))).toBe(map);
    expect(map.set(key, new Set([ 456, 789 ]))).toBe(map);
    expect(map.has(key)).toBe(true);
    expect(map.hasEntry(key, 123)).toBe(false);
    expect(map.hasEntry(key, 456)).toBe(true);
    expect(map.hasEntry(key, 789)).toBe(true);
    expect(map.get(key)).toEqual(new Set([ 456, 789 ]));
    expect(map.size).toBe(2);
  });

  it('can set entries in the constructor.', async(): Promise<void> => {
    map = new WrappedSetMultiMap(undefined, [[ key, 123 ], [ key, new Set([ 456, 789 ]) ]]);
    expect(map.has(key)).toBe(true);
    expect(map.hasEntry(key, 123)).toBe(true);
    expect(map.hasEntry(key, 456)).toBe(true);
    expect(map.hasEntry(key, 789)).toBe(true);
    expect(map.get(key)).toEqual(new Set([ 123, 456, 789 ]));
    expect(map.size).toBe(3);
  });

  it('can add a single value.', async(): Promise<void> => {
    expect(map.set(key, 123)).toBe(map);
    expect(map.add(key, 456)).toBe(map);
    expect(map.hasEntry(key, 123)).toBe(true);
    expect(map.hasEntry(key, 456)).toBe(true);
    expect(map.get(key)).toEqual(new Set([ 123, 456 ]));
    expect(map.size).toBe(2);
  });

  it('can add multiple values.', async(): Promise<void> => {
    expect(map.set(key, new Set([ 123, 456 ]))).toBe(map);
    expect(map.add(key, 789)).toBe(map);
    expect(map.hasEntry(key, 123)).toBe(true);
    expect(map.hasEntry(key, 456)).toBe(true);
    expect(map.hasEntry(key, 789)).toBe(true);
    expect(map.get(key)).toEqual(new Set([ 123, 456, 789 ]));
    expect(map.size).toBe(3);
  });

  it('can add a a value to a non-existent key.', async(): Promise<void> => {
    expect(map.add(key, 123)).toBe(map);
    expect(map.hasEntry(key, 123)).toBe(true);
    expect(map.get(key)).toEqual(new Set([ 123 ]));
    expect(map.size).toBe(1);
  });

  it('correctly updates if the new value already exists.', async(): Promise<void> => {
    expect(map.set(key, 123)).toBe(map);
    expect(map.add(key, 123)).toBe(map);
    expect(map.hasEntry(key, 123)).toBe(true);
    expect(map.get(key)).toEqual(new Set([ 123 ]));
    expect(map.size).toBe(1);
  });

  it('correctly updates if some new values already exist.', async(): Promise<void> => {
    expect(map.set(key, new Set([ 123, 456 ]))).toBe(map);
    expect(map.add(key, new Set([ 456, 789 ]))).toBe(map);
    expect(map.hasEntry(key, 123)).toBe(true);
    expect(map.hasEntry(key, 456)).toBe(true);
    expect(map.hasEntry(key, 789)).toBe(true);
    expect(map.get(key)).toEqual(new Set([ 123, 456, 789 ]));
    expect(map.size).toBe(3);
  });

  it('removes the key if it is being set to an empty Set.', async(): Promise<void> => {
    expect(map.set(key, 123)).toBe(map);
    expect(map.set(key, new Set())).toBe(map);
    expect(map.has(key)).toBe(false);
    expect(map.size).toBe(0);
  });

  it('can delete a key.', async(): Promise<void> => {
    expect(map.set(key, new Set([ 123, 456 ]))).toBe(map);
    expect(map.delete(key)).toBe(true);
    expect(map.has(key)).toBe(false);
    expect(map.hasEntry(key, 123)).toBe(false);
    expect(map.hasEntry(key, 456)).toBe(false);
    expect(map.get(key)).toBeUndefined();
    expect(map.delete(key)).toBe(false);
    expect(map.size).toBe(0);
  });

  it('can delete a single entry.', async(): Promise<void> => {
    expect(map.set(key, new Set([ 123, 456 ]))).toBe(map);
    expect(map.deleteEntry(key, 123)).toBe(true);
    expect(map.has(key)).toBe(true);
    expect(map.hasEntry(key, 123)).toBe(false);
    expect(map.hasEntry(key, 456)).toBe(true);
    expect(map.get(key)).toEqual(new Set([ 456 ]));
    expect(map.deleteEntry(key, 123)).toBe(false);
    expect(map.size).toBe(1);
  });

  it('removes the key if the last entry is deleted.', async(): Promise<void> => {
    expect(map.set(key, 123)).toBe(map);
    expect(map.deleteEntry(key, 123)).toBe(true);
    expect(map.has(key)).toBe(false);
    expect(map.hasEntry(key, 123)).toBe(false);
    expect(map.get(key)).toBeUndefined();
    expect(map.delete(key)).toBe(false);
    expect(map.size).toBe(0);
  });

  it('can clear the entire Map.', async(): Promise<void> => {
    expect(map.set(key, new Set([ 123, 456 ]))).toBe(map);
    map.clear();
    expect(map.has(key)).toBe(false);
    expect(map.size).toBe(0);
  });

  it('can iterate over the Map.', async(): Promise<void> => {
    expect(map.set(key, new Set([ 123, 456 ]))).toBe(map);
    expect([ ...map ]).toEqual([[ key, 123 ], [ key, 456 ]]);
    expect([ ...map.entries() ]).toEqual([[ key, 123 ], [ key, 456 ]]);
    expect([ ...map.entrySets() ]).toEqual([[ key, new Set([ 123, 456 ]) ]]);
    expect([ ...map.keys() ]).toEqual([ key, key ]);
    expect([ ...map.distinctKeys() ]).toEqual([ key ]);
    expect([ ...map.values() ]).toEqual([ 123, 456 ]);
    expect([ ...map.valueSets() ]).toEqual([ new Set([ 123, 456 ]) ]);
  });

  it('exposes a readonly view on the internal Map for iteration.', async(): Promise<void> => {
    expect(map.set(key, new Set([ 123, 456 ]))).toBe(map);
    expect([ ...map.asMap() ]).toEqual([[ key, new Set([ 123, 456 ]) ]]);
  });

  it('supports a forEach call.', async(): Promise<void> => {
    expect(map.set(key, new Set([ 123, 456 ]))).toBe(map);
    const result: number[] = [];
    // eslint-disable-next-line unicorn/no-array-for-each
    map.forEach((value): void => {
      result.push(value);
    });
    expect(result).toEqual([ 123, 456 ]);
  });
});
