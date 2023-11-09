import { createResponse } from 'node-mocks-http';
import { WacAllowMetadataWriter } from '../../../../../src/http/output/metadata/WacAllowMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { ACL, AUTH } from '../../../../../src/util/Vocabularies';

describe('A WacAllowMetadataWriter', (): void => {
  const writer = new WacAllowMetadataWriter();
  let response: HttpResponse;

  beforeEach(async(): Promise<void> => {
    response = createResponse() as HttpResponse;
  });

  it('adds no header if there is no relevant metadata.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });

  it('adds a WAC-Allow header if there is relevant metadata.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({
      [AUTH.userMode]: [ ACL.terms.Read, ACL.terms.Write ],
      [AUTH.publicMode]: [ ACL.terms.Read ],
    });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();

    expect(response.getHeaders()).toEqual({
      'wac-allow': 'user="read write",public="read"',
    });
  });

  it('only adds a header value for entries with at least 1 permission.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({
      [AUTH.userMode]: [ ACL.terms.Read, ACL.terms.Write ],
    });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();

    expect(response.getHeaders()).toEqual({
      'wac-allow': 'user="read write"',
    });
  });

  it('applies public modes to user modes.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({
      [AUTH.publicMode]: [ ACL.terms.Read, ACL.terms.Write ],
    });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();

    expect(response.getHeaders()).toEqual({
      'wac-allow': 'user="read write",public="read write"',
    });
  });
});
