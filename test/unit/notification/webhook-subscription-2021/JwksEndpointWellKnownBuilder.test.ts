import {
  JwksEndpointWellKnownBuilder,
} from '../../../../src/notification/webhook-subscription-2021/JwksEndpointWellKnownBuilder';

describe('A JwksEndpointWellKnownBuilder', (): void => {
  const expected = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    jwks_endpoint: 'https://example.com/podjwks',
  };

  it('returns the expected jwk_endpoint.', async(): Promise<void> => {
    const builder = new JwksEndpointWellKnownBuilder('https://example.com/', 'podjwks');
    await expect(builder.getWellKnownSegment()).resolves.toMatchObject(expected);
  });
});
