import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { StaticThrowHandler } from '../../../../src/util/handlers/StaticThrowHandler';

describe('A StaticThrowHandler', (): void => {
  const error = new BadRequestHttpError();
  const handler = new StaticThrowHandler(error);

  it('can handle all requests.', async(): Promise<void> => {
    await expect(handler.canHandle({})).resolves.toBeUndefined();
  });

  it('always throws the given error.', async(): Promise<void> => {
    await expect(handler.handle()).rejects.toThrow(error);
  });
});
