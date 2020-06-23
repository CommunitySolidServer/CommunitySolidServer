import { AuthorizerArgs } from '../../../src/authorization/Authorizer';
import { SimpleAuthorizer } from '../../../src/authorization/SimpleAuthorizer';
import { UnsupportedHttpError } from '../../../src/util/errors/UnsupportedHttpError';

describe('A SimpleAuthorizer', (): void => {
  const authorizer = new SimpleAuthorizer();

  it('requires input to have an identifier and permissions.', async(): Promise<void> => {
    await expect(authorizer.canHandle({ identifier: {}, permissions: {}} as AuthorizerArgs)).resolves.toBeUndefined();
    await expect(authorizer.canHandle({ identifier: {}} as AuthorizerArgs)).rejects.toThrow(UnsupportedHttpError);
    await expect(authorizer.canHandle({ permissions: {}} as AuthorizerArgs)).rejects.toThrow(UnsupportedHttpError);
  });

  it('always returns undefined.', async(): Promise<void> => {
    await expect(authorizer.handle()).resolves.toBeUndefined();
  });
});
