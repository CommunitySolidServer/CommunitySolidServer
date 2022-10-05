import { getDefault, modify } from '../../../../src/util/map/MapUtil';
import { WrappedSetMultiMap } from '../../../../src/util/map/WrappedSetMultiMap';
import { compareMaps } from '../../../util/Util';

describe('MapUtil', (): void => {
  const key1 = 'key1';
  const key2 = 'key2';
  const key3 = 'key3';

  describe('#modify', (): void => {
    it('modifies the map as specified.', async(): Promise<void> => {
      const map = new WrappedSetMultiMap(undefined, [
        [ key1, 123 ],
        [ key2, 123 ],
      ]);
      const add: Iterable<[string, number]> = [[ key1, 456 ], [ key3, 123 ]];
      const remove = [ key2 ];

      const expected = new WrappedSetMultiMap(undefined, [
        [ key1, 123 ],
        [ key1, 456 ],
        [ key3, 123 ],
      ]);

      modify(map, { add, remove });
      compareMaps(map, expected);
    });
    it('defaults to empty add and delete Iterables.', async(): Promise<void> => {
      const map = new WrappedSetMultiMap(undefined, [
        [ key1, 123 ],
        [ key2, 123 ],
      ]);

      const expected = new WrappedSetMultiMap(undefined, [
        [ key1, 123 ],
        [ key2, 123 ],
      ]);

      modify(map, {});
      compareMaps(map, expected);
    });
  });

  describe('#getDefault', (): void => {
    it('returns the value it finds in the Map for the given key.', async(): Promise<void> => {
      const map = new Map([[ key1, 123 ]]);
      expect(getDefault(map, key1, (): number => 999)).toBe(123);
    });

    it('returns the default value if it finds no value for the given key.', async(): Promise<void> => {
      const map = new Map([[ key1, 123 ]]);
      expect(getDefault(map, key2, (): number => 999)).toBe(999);
    });

    it('can handle async default functions.', async(): Promise<void> => {
      const map = new Map([[ key1, 123 ]]);
      await expect(getDefault(map, key2, async(): Promise<number> => 999)).resolves.toBe(999);
    });
  });
});
