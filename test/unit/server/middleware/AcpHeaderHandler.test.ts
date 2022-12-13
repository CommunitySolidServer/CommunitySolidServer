import { ACP } from '@solid/access-control-policy';
import { createResponse } from 'node-mocks-http';
import type { AuxiliaryIdentifierStrategy } from '../../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import type { TargetExtractor } from '../../../../src/http/input/identifier/TargetExtractor';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { AcpHeaderHandler } from '../../../../src/server/middleware/AcpHeaderHandler';
import { ACL } from '../../../../src/util/Vocabularies';
import { SimpleSuffixStrategy } from '../../../util/SimpleSuffixStrategy';

describe('an AcpHeaderHandler', (): void => {
  const request: HttpRequest = {} as any;
  let response: HttpResponse;
  const modes = [ ACL.Read, ACL.Write ];
  const attributes = [ ACP.agent, ACP.client ];
  let targetExtractor: jest.Mocked<TargetExtractor>;
  let strategy: AuxiliaryIdentifierStrategy;
  let handler: AcpHeaderHandler;

  beforeEach(async(): Promise<void> => {
    response = createResponse() as HttpResponse;
    targetExtractor = {
      handleSafe: jest.fn().mockResolvedValue({ path: 'http://example.org/foo/bar' }),
    } as any;

    strategy = new SimpleSuffixStrategy('.acr');

    handler = new AcpHeaderHandler(targetExtractor, strategy, modes, attributes);
  });

  it('adds no headers if the target is not an ACR.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });

  it('adds all the required headers.', async(): Promise<void> => {
    targetExtractor.handleSafe.mockResolvedValueOnce({ path: 'http://example.org/foo/bar.acr' });
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link: [
      '<http://www.w3.org/ns/solid/acp#AccessControlResource>; rel="type"',
      '<http://www.w3.org/ns/auth/acl#Read>; rel="http://www.w3.org/ns/solid/acp#grant"',
      '<http://www.w3.org/ns/auth/acl#Write>; rel="http://www.w3.org/ns/solid/acp#grant"',
      '<http://www.w3.org/ns/solid/acp#agent>; rel="http://www.w3.org/ns/solid/acp#attribute"',
      '<http://www.w3.org/ns/solid/acp#client>; rel="http://www.w3.org/ns/solid/acp#attribute"',
    ]});
  });
});
