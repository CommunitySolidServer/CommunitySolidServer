import { importOidcProvider } from '../../../src/identity/IdentityUtil';

describe('IdentityUtil', (): void => {
  it('avoids dynamic imports when testing with Jest.', async(): Promise<void> => {
    const oidc = await importOidcProvider();
    expect(oidc.default).toBeDefined();
    expect(oidc.interactionPolicy).toBeDefined();
  });

  it('imports the oidc-provider package when not running jest.', async(): Promise<void> => {
    // We need to fool the IDP factory into thinking we are not in a test run
    const jestWorkerId = process.env.JEST_WORKER_ID;
    const nodeEnv = process.env.NODE_ENV;
    delete process.env.JEST_WORKER_ID;
    delete process.env.NODE_ENV;

    const oidc = await importOidcProvider();
    expect(oidc.default).toBeDefined();
    expect(oidc.interactionPolicy).toBeDefined();

    process.env.JEST_WORKER_ID = jestWorkerId;
    process.env.NODE_ENV = nodeEnv;
  });
});
