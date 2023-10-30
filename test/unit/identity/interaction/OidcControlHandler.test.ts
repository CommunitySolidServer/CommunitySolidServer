import { OidcControlHandler } from '../../../../src/identity/interaction/OidcControlHandler';

describe('An OidcControlHandler', (): void => {
  const handler = new OidcControlHandler({ key: {
    getPath: jest.fn().mockReturnValue('http://example.com/foo/'),
    matchPath: jest.fn().mockReturnValue(true),
  }});

  it('returns results if there is an OIDC interaction.', async(): Promise<void> => {
    await expect(handler.handle({ oidcInteraction: {}} as any))
      .resolves.toEqual({ json: { key: 'http://example.com/foo/' }});
  });

  it('returns an empty object if there is no OIDC interaction.', async(): Promise<void> => {
    await expect(handler.handle({} as any)).resolves.toEqual({ json: {}});
  });
});
