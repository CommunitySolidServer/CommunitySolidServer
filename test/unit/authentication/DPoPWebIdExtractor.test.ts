import { createSolidTokenVerifier } from '@solid/access-token-verifier';
import { CredentialGroup } from '../../../src/authentication/Credentials';
import { DPoPWebIdExtractor } from '../../../src/authentication/DPoPWebIdExtractor';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import { StaticAsyncHandler } from '../../util/StaticAsyncHandler';

const solidTokenVerifier = createSolidTokenVerifier() as jest.MockedFunction<any>;

describe('A DPoPWebIdExtractor', (): void => {
  const targetExtractor = new StaticAsyncHandler(true, { path: 'http://example.org/foo/bar' });
  const webIdExtractor = new DPoPWebIdExtractor(targetExtractor);

  beforeEach((): void => {
    jest.clearAllMocks();
    jest.spyOn(targetExtractor, 'handle');
  });

  describe('on a request without Authorization header', (): void => {
    const request = {
      method: 'GET',
      headers: {
        dpop: 'token-5678',
      },
    } as any as HttpRequest;

    it('throws an error.', async(): Promise<void> => {
      const result = webIdExtractor.handleSafe(request);
      await expect(result).rejects.toThrow(NotImplementedHttpError);
      await expect(result).rejects.toThrow('No DPoP-bound Authorization header specified.');
    });
  });

  describe('on a request with an Authorization header that does not start with DPoP', (): void => {
    const request = {
      method: 'GET',
      headers: {
        authorization: 'Other token-1234',
        dpop: 'token-5678',
      },
    } as any as HttpRequest;

    it('throws an error.', async(): Promise<void> => {
      const result = webIdExtractor.handleSafe(request);
      await expect(result).rejects.toThrow(NotImplementedHttpError);
      await expect(result).rejects.toThrow('No DPoP-bound Authorization header specified.');
    });
  });

  describe('on a request without DPoP header', (): void => {
    const request = {
      method: 'GET',
      headers: {
        authorization: 'DPoP token-1234',
      },
    } as any as HttpRequest;

    it('throws an error.', async(): Promise<void> => {
      const result = webIdExtractor.handleSafe(request);
      await expect(result).rejects.toThrow(BadRequestHttpError);
      await expect(result).rejects.toThrow('No DPoP header specified.');
    });
  });

  describe('on a request with Authorization and DPop headers', (): void => {
    const request = {
      method: 'GET',
      headers: {
        authorization: 'DPoP token-1234',
        dpop: 'token-5678',
      },
    } as any as HttpRequest;

    it('calls the target extractor with the correct parameters.', async(): Promise<void> => {
      await webIdExtractor.handleSafe(request);
      expect(targetExtractor.handle).toHaveBeenCalledTimes(1);
      expect(targetExtractor.handle).toHaveBeenCalledWith({ request });
    });

    it('calls the DPoP verifier with the correct parameters.', async(): Promise<void> => {
      await webIdExtractor.handleSafe(request);
      expect(solidTokenVerifier).toHaveBeenCalledTimes(1);
      expect(solidTokenVerifier).toHaveBeenCalledWith('DPoP token-1234', { header: 'token-5678', method: 'GET', url: 'http://example.org/foo/bar' });
    });

    it('returns the extracted WebID.', async(): Promise<void> => {
      const result = webIdExtractor.handleSafe(request);
      await expect(result).resolves.toEqual({ [CredentialGroup.agent]: { webId: 'http://alice.example/card#me' }});
    });
  });

  describe('on a request with Authorization specifying DPoP in lowercase', (): void => {
    const request = {
      method: 'GET',
      headers: {
        authorization: 'dpop token-1234',
        dpop: 'token-5678',
      },
    } as any as HttpRequest;

    it('calls the target extractor with the correct parameters.', async(): Promise<void> => {
      await webIdExtractor.handleSafe(request);
      expect(targetExtractor.handle).toHaveBeenCalledTimes(1);
      expect(targetExtractor.handle).toHaveBeenCalledWith({ request });
    });
  });

  describe('when verification throws an error', (): void => {
    const request = {
      method: 'GET',
      headers: {
        authorization: 'DPoP token-1234',
        dpop: 'token-5678',
      },
    } as any as HttpRequest;

    beforeEach((): void => {
      solidTokenVerifier.mockImplementationOnce((): void => {
        throw new Error('invalid');
      });
    });

    it('throws an error.', async(): Promise<void> => {
      const result = webIdExtractor.handleSafe(request);
      await expect(result).rejects.toThrow(BadRequestHttpError);
      await expect(result).rejects.toThrow('Error verifying WebID via DPoP-bound access token: invalid');
    });
  });
});
