import { createSolidTokenVerifier } from 'ts-dpop';
import { BearerWebIdExtractor } from '../../../src/authentication/BearerWebIdExtractor';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

const solidTokenVerifier = createSolidTokenVerifier() as jest.MockedFunction<any>;

describe('A BearerWebIdExtractor', (): void => {
  const webIdExtractor = new BearerWebIdExtractor();

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('on a request without Authorization header', (): void => {
    const request = {
      method: 'GET',
      headers: { },
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

    it('returns the extracted WebID.', async(): Promise<void> => {
      const result = webIdExtractor.handleSafe(request);
      await expect(result).resolves.toEqual({ webId: 'http://alice.example/card#me' });
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
      solidTokenVerifier.mockImplementationOnce((): void => {
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
