import { WebHook2021AuthWellKnownBuilder }
  from '../../../../../src/notification/webhook-subscription-2021/webhook-auth/WebHook2021AuthWellKnownBuilder';

describe('A WebHook2021AuthWellKnownBuilder', (): void => {
  it('returns the configured jwks path.', async(): Promise<void> => {
    const webHook2021AuthWellKnownBuilder = new WebHook2021AuthWellKnownBuilder({
      baseUrl: 'http://server',
      jwksEndpointPath: 'jwks',
    });
    const expected = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      jwks_endpoint: 'http://server/jwks',
    };
    expect(await webHook2021AuthWellKnownBuilder.getWellKnownSegment()).toEqual(expected);
  });
});

