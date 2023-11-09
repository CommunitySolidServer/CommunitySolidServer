import { HashMap } from '../../../../src/util/map/HashMap';

type KeyType = { field1: string; field2: number };
type ValueType = { field3: string; field4: number };

function hashFn(key: KeyType): string {
  return `${key.field1}${key.field2}`;
}

describe('A HashMap', (): void => {
  const key1: KeyType = { field1: 'key', field2: 123 };
  const key1Eq: KeyType = { field1: 'key', field2: 123 };
  const key2: KeyType = { field1: 'key', field2: 321 };
  const unknownKey: KeyType = { field1: 'key', field2: 999 };
  const value1: ValueType = { field3: 'value', field4: 123 };
  const value2: ValueType = { field3: 'value', field4: 321 };

  let map: HashMap<KeyType, ValueType>;

  beforeEach(async(): Promise<void> => {
    map = new HashMap(hashFn);

    map.set(key1, value1);
    map.set(key2, value2);
  });

  it('can check if the map has a key.', async(): Promise<void> => {
    expect(map.has(key1)).toBe(true);
    expect(map.has(key1Eq)).toBe(true);
    expect(map.has(key2)).toBe(true);
    expect(map.has(unknownKey)).toBe(false);
  });

  it('can get the values from the map.', async(): Promise<void> => {
    expect(map.get(key1)).toBe(value1);
    expect(map.get(key1Eq)).toBe(value1);
    expect(map.get(key2)).toBe(value2);
    expect(map.get(unknownKey)).toBeUndefined();
  });

  it('can set values.', async(): Promise<void> => {
    map.set(key1Eq, value2);
    expect(map.get(key1)).toBe(value2);
  });

  it('can set values in the constructor.', async(): Promise<void> => {
    map = new HashMap<KeyType, ValueType>(hashFn, [[ key1, value1 ]]);
    expect(map.get(key1)).toBe(value1);
    expect(map.has(key2)).toBe(false);
  });

  it('can remove values.', async(): Promise<void> => {
    map.delete(key1Eq);
    expect(map.has(key1)).toBe(false);
    expect(map.has(key2)).toBe(true);
  });

  it('can clear the map.', async(): Promise<void> => {
    map.clear();
    expect(map.has(key1)).toBe(false);
    expect(map.has(key2)).toBe(false);
  });

  it('can iterate over the map.', async(): Promise<void> => {
    expect([ ...map ]).toEqual([[ key1, value1 ], [ key2, value2 ]]);
    expect([ ...map.entries() ]).toEqual([[ key1, value1 ], [ key2, value2 ]]);
    expect([ ...map.keys() ]).toEqual([ key1, key2 ]);
    expect([ ...map.values() ]).toEqual([ value1, value2 ]);
  });

  it('supports a forEach call.', async(): Promise<void> => {
    const result: string[] = [];
    // eslint-disable-next-line unicorn/no-array-for-each
    map.forEach((value): void => {
      result.push(value.field3);
    });
    expect(result).toEqual([ 'value', 'value' ]);
  });

  it('can return the size.', async(): Promise<void> => {
    expect(map.size).toBe(2);
    map.delete(key1);
    expect(map.size).toBe(1);
    map.clear();
    expect(map.size).toBe(0);
  });

  it('returns a string tag.', async(): Promise<void> => {
    expect(map[Symbol.toStringTag]).toBe('HashMap');
  });
});
