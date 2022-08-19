import { asyncToArray, concat, filter, find, map, reduce, sortedAsyncMerge } from '../../../src/util/IterableUtil';

describe('IterableUtil', (): void => {
  describe('#map', (): void => {
    it('maps the values to a new iterable.', async(): Promise<void> => {
      const input = [ 1, 2, 3 ];
      expect([ ...map(input, (val): number => val + 3) ]).toEqual([ 4, 5, 6 ]);
    });
  });

  describe('#filter', (): void => {
    it('filters the values of the iterable.', async(): Promise<void> => {
      const input = [ 1, 2, 3 ];
      expect([ ...filter(input, (val): boolean => val % 2 === 1) ]).toEqual([ 1, 3 ]);
    });
  });

  describe('#concat', (): void => {
    it('concatenates all the iterables.', async(): Promise<void> => {
      const input = [[ 1, 2, 3 ], [ 4, 5, 6 ], [ 7, 8, 9 ]];
      expect([ ...concat(input) ]).toEqual([ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]);
    });
  });

  describe('#find', (): void => {
    it('finds the matching value.', async(): Promise<void> => {
      const input = [[ 1, 2, 3 ], [ 4, 5, 6 ], [ 7, 8, 9 ]];
      expect(find(input, (entry): boolean => entry.includes(5))).toEqual([ 4, 5, 6 ]);
    });

    it('returns undefined if there is no match.', async(): Promise<void> => {
      const input = [[ 1, 2, 3 ], [ 4, 5, 6 ], [ 7, 8, 9 ]];
      expect(find(input, (entry): boolean => entry.includes(0))).toBeUndefined();
    });
  });

  describe('#reduce', (): void => {
    it('reduces the values in an iterable.', async(): Promise<void> => {
      const input = [ 1, 2, 3 ];
      expect(reduce(input, (acc, cur): number => acc + cur)).toBe(6);
    });

    it('can take a starting value.', async(): Promise<void> => {
      const input = [ 1, 2, 3 ];
      expect(reduce(input, (acc, cur): number => acc + cur, 4)).toBe(10);
    });

    it('throws an error if the iterable is empty and there is no initial value.', async(): Promise<void> => {
      const input: number[] = [];
      expect((): number => reduce(input, (acc, cur): number => acc + cur)).toThrow(TypeError);
    });
  });

  describe('#sortedAsyncMerge', (): void => {
    it('sorts the iterables.', async(): Promise<void> => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      async function* left(): AsyncIterator<number> {
        yield* [ 1, 3, 5, 7, 9 ];
      }
      // eslint-disable-next-line unicorn/consistent-function-scoping
      async function* right(): AsyncIterator<number> {
        yield* [ 0, 2, 3, 4 ];
      }
      await expect(asyncToArray(sortedAsyncMerge([ left(), right() ]))).resolves
        .toEqual([ 0, 1, 2, 3, 3, 4, 5, 7, 9 ]);
    });

    it('accepts a custom comparator.', async(): Promise<void> => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      async function* left(): AsyncIterator<string> {
        yield* [ 'apple', 'citrus', 'date' ];
      }
      // eslint-disable-next-line unicorn/consistent-function-scoping
      async function* right(): AsyncIterator<string> {
        yield* [ 'banana', 'donut' ];
      }
      await expect(asyncToArray(sortedAsyncMerge([ left(), right() ]))).resolves
        .toEqual([ 'apple', 'banana', 'citrus', 'date', 'donut' ]);
    });
  });
});
