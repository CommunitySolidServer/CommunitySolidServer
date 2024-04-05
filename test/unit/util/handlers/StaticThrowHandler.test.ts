import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { StaticThrowHandler } from '../../../../src/util/handlers/StaticThrowHandler';
import { SOLID_ERROR } from '../../../../src/util/Vocabularies';

describe('A StaticThrowHandler', (): void => {
  const error = new BadRequestHttpError();
  const handler = new StaticThrowHandler(error);

  it('can handle all requests.', async(): Promise<void> => {
    await expect(handler.canHandle({})).resolves.toBeUndefined();
  });

  it('always throws an instance of the given error.', async(): Promise<void> => {
    await expect(handler.handle()).rejects.toThrow(error);
  });

  it('creates a new instance every time.', async(): Promise<void> => {
    /* eslint-disable jest/no-conditional-expect */
    try {
      await handler.handle();
    } catch (error: unknown) {
      expect(BadRequestHttpError.isInstance(error)).toBe(true);
      // Change the metadata
      (error as BadRequestHttpError).metadata.add(SOLID_ERROR.terms.target, 'http://example.com/foo');
    }
    try {
      await handler.handle();
    } catch (error: unknown) {
      expect(BadRequestHttpError.isInstance(error)).toBe(true);
      // Metadata should not have the change
      expect((error as BadRequestHttpError).metadata.has(SOLID_ERROR.terms.target)).toBe(false);
    }
    /* eslint-enable jest/no-conditional-expect */
  });
});
