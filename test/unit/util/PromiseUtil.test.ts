import { promiseAny } from '../../../src/util/PromiseUtil';

describe('PromiseUtil', (): void => {
  describe('#promiseAny', (): void => {
    it('returns false if no promise is provided.', async(): Promise<void> => {
      await expect(promiseAny([])).resolves.toEqual(false);
    });

    it('returns false if no promise returns true.', async(): Promise<void> => {
      const promise1 = Promise.resolve(false);
      const promise2 = Promise.resolve(false);
      const promise3 = Promise.resolve(false);

      await expect(promiseAny([ promise1, promise2, promise3 ])).resolves.toEqual(false);
    });

    it('returns true if at least a promise returns true.', async(): Promise<void> => {
      const promise1 = Promise.resolve(false);
      const promise2 = Promise.resolve(true);
      const promise3 = Promise.resolve(false);

      await expect(promiseAny([ promise1, promise2, promise3 ])).resolves.toEqual(true);
    });

    it('does not propagate errors.', async(): Promise<void> => {
      const promise1 = Promise.reject(new Error('generic error'));
      const promise2 = Promise.resolve(false);
      const promise3 = Promise.resolve(false);

      await expect(promiseAny([ promise1, promise2, promise3 ])).resolves.toEqual(false);
    });
  });
});
