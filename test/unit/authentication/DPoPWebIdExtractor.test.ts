import { verify } from 'ts-dpop';
import { DPoPWebIdExtractor } from '../../../src/authentication/DPoPWebIdExtractor';
import { TargetExtractor } from '../../../src/ldp/http/TargetExtractor';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { HttpRequest } from '../../../src/server/HttpRequest';

class DummyTargetExtractor extends TargetExtractor {
  public async handle(): Promise<ResourceIdentifier> {
    return { path: 'http://example.org/foo/bar' };
  }
}

describe('A DPoPWebIdExtractor', (): void => {
  const targetExtractor = new DummyTargetExtractor();
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

    it('returns empty credentials.', async(): Promise<void> => {
      await expect(webIdExtractor.handle(request)).resolves.toEqual({});
    });
  });

  describe('on a request without DPoP header', (): void => {
    const request = {
      method: 'GET',
      headers: {
        authorization: 'DPoP token-1234',
      },
    } as any as HttpRequest;

    it('returns empty credentials.', async(): Promise<void> => {
      await expect(webIdExtractor.handle(request)).resolves.toEqual({});
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
      await webIdExtractor.handle(request);
      expect(targetExtractor.handle).toHaveBeenCalledTimes(1);
      expect(targetExtractor.handle).toHaveBeenCalledWith(request);
    });

    it('calls the DPoP verifier with the correct parameters.', async(): Promise<void> => {
      await webIdExtractor.handle(request);
      expect(verify).toHaveBeenCalledTimes(1);
      expect(verify).toHaveBeenCalledWith('DPoP token-1234', 'token-5678', 'GET', 'http://example.org/foo/bar');
    });

    it('returns the extracted WebID.', async(): Promise<void> => {
      await expect(webIdExtractor.handle(request)).resolves
        .toEqual({ webID: 'http://alice.example/card#me' });
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
      (verify as jest.MockedFunction<any>).mockImplementationOnce((): void => {
        throw new Error('invalid');
      });
    });

    it('returns empty credentials.', async(): Promise<void> => {
      await expect(webIdExtractor.handle(request)).resolves.toEqual({});
    });
  });
});
