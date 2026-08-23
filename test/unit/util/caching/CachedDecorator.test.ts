import { cached } from '../../../../src/util/caching/CachedDecorator';

describe('The cached decorator', (): void => {
  it('caches a method result per instance based on the first argument.', async(): Promise<void> => {
    const spy = jest.fn();
    class Counter {
      private count = 0;

      @cached()
      public async get(key: string): Promise<number> {
        spy(key);
        const value = this.count;
        this.count += 1;
        return value;
      }
    }
    const instance = new Counter();
    await expect(instance.get('a')).resolves.toBe(0);
    await expect(instance.get('a')).resolves.toBe(0);
    await expect(instance.get('b')).resolves.toBe(1);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 'a');
    expect(spy).toHaveBeenNthCalledWith(2, 'b');
  });

  it('gives each instance its own cache.', async(): Promise<void> => {
    class Counter {
      private count = 0;

      @cached()
      public async get(): Promise<number> {
        const value = this.count;
        this.count += 1;
        return value;
      }
    }
    const first = new Counter();
    const second = new Counter();
    await expect(first.get()).resolves.toBe(0);
    await expect(second.get()).resolves.toBe(0);
    await expect(first.get()).resolves.toBe(0);
  });

  it('can key a WeakMap-backed cache on object identity.', async(): Promise<void> => {
    const spy = jest.fn();
    class Store {
      private count = 0;

      @cached({ weak: true })
      public async get(key: object): Promise<number> {
        spy(key);
        const value = this.count;
        this.count += 1;
        return value;
      }
    }
    const store = new Store();
    const key1 = {};
    const key2 = {};
    await expect(store.get(key1)).resolves.toBe(0);
    await expect(store.get(key1)).resolves.toBe(0);
    await expect(store.get(key2)).resolves.toBe(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('supports deriving the cache key from all arguments.', async(): Promise<void> => {
    const spy = jest.fn();
    class Store {
      @cached({ key: (a: string, b: string): string => `${a}:${b}` })
      public async get(a: string, b: string): Promise<string> {
        spy();
        return `${a}${b}`;
      }
    }
    const store = new Store();
    await expect(store.get('a', 'b')).resolves.toBe('ab');
    await expect(store.get('a', 'b')).resolves.toBe('ab');
    await expect(store.get('a', 'c')).resolves.toBe('ac');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent calls onto a single computation.', async(): Promise<void> => {
    const spy = jest.fn();
    class Store {
      @cached()
      public async get(key: string): Promise<string> {
        spy();
        return key;
      }
    }
    const store = new Store();
    const firstPromise = store.get('a');
    const secondPromise = store.get('a');
    expect(firstPromise).toBe(secondPromise);
    const [ first, second ] = await Promise.all([ firstPromise, secondPromise ]);
    expect(first).toBe('a');
    expect(second).toBe('a');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('retries the method after a rejection by default.', async(): Promise<void> => {
    let calls = 0;
    class Store {
      @cached()
      public async get(key: string): Promise<number> {
        calls += 1;
        if (calls === 1) {
          throw new Error(`fail-${key}`);
        }
        return 5;
      }
    }
    const store = new Store();
    await expect(store.get('a')).rejects.toThrow('fail-a');
    await expect(store.get('a')).resolves.toBe(5);
    expect(calls).toBe(2);
  });
});
