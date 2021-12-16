import { StaticHandler } from '../../../../src/util/handlers/StaticHandler';

describe('A StaticHandler', (): void => {
  it('can handle everything.', async(): Promise<void> => {
    const handler = new StaticHandler();
    await expect(handler.canHandle(null)).resolves.toBeUndefined();
  });

  it('returns the stored value.', async(): Promise<void> => {
    const handler = new StaticHandler('apple');
    await expect(handler.handle()).resolves.toBe('apple');
  });

  it('returns undefined if there is no stored value.', async(): Promise<void> => {
    const handler = new StaticHandler();
    await expect(handler.handle()).resolves.toBeUndefined();
  });
});
