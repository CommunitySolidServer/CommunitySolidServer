import { DenyAllAuthorizer } from '../../../src/authorization/DenyAllAuthorizer';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';

describe('A DenyAllAuthorizer', (): void => {
  const authorizer = new DenyAllAuthorizer();

  it('can handle all requests.', async(): Promise<void> => {
    await expect(authorizer.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('rejects all requests.', async(): Promise<void> => {
    await expect(authorizer.handle()).rejects.toThrow(ForbiddenHttpError);
  });
});
