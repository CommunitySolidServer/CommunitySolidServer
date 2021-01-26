import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { UnsupportedAsyncHandler } from '../../../../src/util/handlers/UnsupportedAsyncHandler';

describe('An UnsupportedAsyncHandler', (): void => {
  it('throws a default error when no message is set.', async(): Promise<void> => {
    const handler = new UnsupportedAsyncHandler();
    await expect(handler.canHandle()).rejects.toThrow(NotImplementedHttpError);
    await expect(handler.handle()).rejects.toThrow(NotImplementedHttpError);
    await expect(handler.handleSafe(null)).rejects.toThrow(NotImplementedHttpError);
  });

  it('throws the specified error when a message is set.', async(): Promise<void> => {
    const handler = new UnsupportedAsyncHandler('custom error');
    await expect(handler.canHandle()).rejects.toThrow('custom error');
    await expect(handler.handle()).rejects.toThrow('custom error');
    await expect(handler.handleSafe(null)).rejects.toThrow('custom error');
  });
});
