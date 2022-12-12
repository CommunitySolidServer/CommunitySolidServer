import { promiseEvery, promiseSome } from '../../../src/util/PromiseUtil';

describe('PromiseUtil', (): void => {
  describe('#promiseEvery', (): void => {
    const resultTrue = Promise.resolve(true);
    const resultFalse = Promise.resolve(false);
    const resultError = Promise.reject(new Error('generic error'));

    it('returns true if no promise is provided.', async(): Promise<void> => {
      await expect(promiseEvery([])).resolves.toBe(true);
    });

    it('returns true if no promise returns false.', async(): Promise<void> => {
      await expect(promiseEvery([ resultTrue, resultTrue, resultTrue ])).resolves.toBe(true);
    });

    it('returns false if at least a promise returns false.', async(): Promise<void> => {
      await expect(promiseEvery([ resultTrue, resultFalse, resultTrue ])).resolves.toBe(false);
    });

    it('counts errors as false.', async(): Promise<void> => {
      await expect(promiseEvery([ resultError, resultTrue, resultTrue ])).resolves.toBe(false);
    });
  });
  describe('#promiseSome', (): void => {
    const resultTrue = Promise.resolve(true);
    const resultFalse = Promise.resolve(false);
    const resultError = Promise.reject(new Error('generic error'));
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const resultInfinite = new Promise<boolean>((): void => {});

    it('returns false if no promise is provided.', async(): Promise<void> => {
      await expect(promiseSome([])).resolves.toBe(false);
    });

    it('returns false if no promise returns true.', async(): Promise<void> => {
      await expect(promiseSome([ resultFalse, resultFalse, resultFalse ])).resolves.toBe(false);
    });

    it('returns true if at least a promise returns true.', async(): Promise<void> => {
      await expect(promiseSome([ resultFalse, resultTrue, resultFalse ])).resolves.toBe(true);
    });

    it('does not propagate errors.', async(): Promise<void> => {
      await expect(promiseSome([ resultError, resultFalse, resultFalse ])).resolves.toBe(false);
    });

    it('works with a combination of promises.', async(): Promise<void> => {
      await expect(promiseSome([ resultError, resultTrue, resultInfinite ])).resolves.toBe(true);
    });
  });
});
