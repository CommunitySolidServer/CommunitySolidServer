import { promiseSome } from '../../../src/util/PromiseUtil';

describe('PromiseUtil', (): void => {
  describe('#promiseSome', (): void => {
    const resultTrue = Promise.resolve(true);
    const resultFalse = Promise.resolve(false);
    const resultError = Promise.reject(new Error('generic error'));
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
