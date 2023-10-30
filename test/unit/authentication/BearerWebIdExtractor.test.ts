import type { SolidTokenVerifierFunction } from '@solid/access-token-verifier';
import type { SolidAccessTokenPayload } from '@solid/access-token-verifier/dist/type/SolidAccessTokenPayload';
import { BearerWebIdExtractor } from '../../../src/authentication/BearerWebIdExtractor';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

let clientId: string | undefined;
const solidTokenVerifier = jest.fn(async(): Promise<SolidAccessTokenPayload> =>
  ({ aud: 'solid', exp: 1234, iat: 1234, iss: 'example.com/idp', webid: 'http://alice.example/card#me', client_id: clientId }));
jest.mock('@solid/access-token-verifier', (): any =>
  ({ createSolidTokenVerifier: (): SolidTokenVerifierFunction => solidTokenVerifier }));

describe('A BearerWebIdExtractor', (): void => {
  const webIdExtractor = new BearerWebIdExtractor();

  beforeEach((): void => {
    clientId = undefined;
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('on a request without Authorization header', (): void => {
    const request = {
      method: 'GET',
      headers: {},
    } as any as HttpRequest;

    it('throws an error.', async(): Promise<void> => {
      const result = webIdExtractor.handleSafe(request);
      await expect(result).rejects.toThrow(NotImplementedHttpError);
      await expect(result).rejects.toThrow('No Bearer Authorization header specified.');
    });
  });

  describe('on a request with an Authorization header that does not start with Bearer', (): void => {
    const request = {
      method: 'GET',
      headers: {
        authorization: 'Other token-1234',
      },
    } as any as HttpRequest;

    it('throws an error.', async(): Promise<void> => {
      const result = webIdExtractor.handleSafe(request);
      await expect(result).rejects.toThrow(NotImplementedHttpError);
      await expect(result).rejects.toThrow('No Bearer Authorization header specified.');
    });
  });

  describe('on a request with Authorization', (): void => {
    const request = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token-1234',
      },
    } as any as HttpRequest;

    it('calls the Bearer verifier with the correct parameters.', async(): Promise<void> => {
      await webIdExtractor.handleSafe(request);
      expect(solidTokenVerifier).toHaveBeenCalledTimes(1);
      expect(solidTokenVerifier).toHaveBeenCalledWith('Bearer token-1234');
    });

    it('returns the extracted credentials.', async(): Promise<void> => {
      const result = webIdExtractor.handleSafe(request);
      await expect(result).resolves.toEqual(
        { agent: { webId: 'http://alice.example/card#me' }, issuer: { url: 'example.com/idp' }},
      );
    });

    it('also returns the clientID if defined.', async(): Promise<void> => {
      clientId = 'http://client.example.com/#me';
      const result = webIdExtractor.handleSafe(request);
      await expect(result).resolves.toEqual(
        { agent: { webId: 'http://alice.example/card#me' }, issuer: { url: 'example.com/idp' }, client: { clientId }},
      );
    });
  });

  describe('on a request with Authorization and a lowercase Bearer token', (): void => {
    const request = {
      method: 'GET',
      headers: {
        authorization: 'bearer token-1234',
      },
    } as any as HttpRequest;

    it('calls the Bearer verifier with the correct parameters.', async(): Promise<void> => {
      await webIdExtractor.handleSafe(request);
      expect(solidTokenVerifier).toHaveBeenCalledTimes(1);
      expect(solidTokenVerifier).toHaveBeenCalledWith('bearer token-1234');
    });
  });

  describe('when verification throws an error', (): void => {
    const request = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token-1234',
      },
    } as any as HttpRequest;

    beforeEach((): void => {
      solidTokenVerifier.mockImplementationOnce((): never => {
        throw new Error('invalid');
      });
    });

    it('throws an error.', async(): Promise<void> => {
      const result = webIdExtractor.handleSafe(request);
      await expect(result).rejects.toThrow(BadRequestHttpError);
      await expect(result).rejects.toThrow('Error verifying WebID via Bearer access token: invalid');
    });
  });
});
