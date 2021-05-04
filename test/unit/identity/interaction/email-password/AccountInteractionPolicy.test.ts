import {
  AccountInteractionPolicy,
} from '../../../../../src/identity/interaction/email-password/AccountInteractionPolicy';

describe('An AccountInteractionPolicy', (): void => {
  const idpPath = '/idp';
  const interactionPolicy = new AccountInteractionPolicy(idpPath);

  it('errors if the idpPath parameter does not start with a slash.', async(): Promise<void> => {
    expect((): any => new AccountInteractionPolicy('idp')).toThrow('idpPath needs to start with a /');
  });

  it('has a select_account policy at index 0.', async(): Promise<void> => {
    expect(interactionPolicy.policy[0].name).toBe('select_account');
  });

  it('creates URLs by prepending /idp/interaction/.', async(): Promise<void> => {
    expect(interactionPolicy.url({ oidc: { uid: 'valid-uid' }} as any)).toBe('/idp/interaction/valid-uid');
  });
});
