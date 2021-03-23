import {
  EmailPasswordInteractionPolicy,
} from '../../../../../src/identity/interaction/email-password/EmailPasswordInteractionPolicy';

describe('An EmailPasswordInteractionPolicy', (): void => {
  const interactionPolicy = new EmailPasswordInteractionPolicy();

  it('has a select_account policy at index 0.', async(): Promise<void> => {
    expect(interactionPolicy.policy[0].name).toBe('select_account');
  });

  it('creates URLs by prepending /idp/interaction/.', async(): Promise<void> => {
    await expect(interactionPolicy.url({ oidc: { uid: 'valid-uid' }} as any))
      .resolves.toBe('/idp/interaction/valid-uid');
  });
});
