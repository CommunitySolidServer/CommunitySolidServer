import { AllowEverythingAuthorizer } from '../../../src/authorization/AllowEverythingAuthorizer';

describe('An AllowEverythingAuthorizer', (): void => {
  const authorizer = new AllowEverythingAuthorizer();

  it('can handle everything.', async(): Promise<void> => {
    await expect(authorizer.canHandle()).resolves.toBeUndefined();
  });

  it('always returns undefined.', async(): Promise<void> => {
    await expect(authorizer.handle()).resolves.toBeUndefined();
  });
});
