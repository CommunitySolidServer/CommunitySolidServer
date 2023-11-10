import { setJitterTimeout } from '../../../src/util/LockUtils';

jest.useFakeTimers();

describe('LockUtil', (): void => {
  describe('#setJitterTimout', (): void => {
    it('works without jitter.', async(): Promise<void> => {
      let result = '';
      const promise = setJitterTimeout(1000).then((): void => {
        result += 'ok';
      });
      expect(result).toHaveLength(0);
      jest.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
      expect(result).toBe('ok');
    });

    it('works with jitter.', async(): Promise<void> => {
      jest.spyOn(globalThis.Math, 'random').mockReturnValue(1);
      let elapsed = Date.now();
      const promise = setJitterTimeout(1000, 100).then((): void => {
        elapsed = Date.now() - elapsed;
      });
      jest.runAllTimers();
      await expect(promise).resolves.toBeUndefined();
      expect(elapsed).toBe(1100);
      // Clean up
      jest.spyOn(globalThis.Math, 'random').mockRestore();
    });
  });
});
