import { createResponse } from 'node-mocks-http';
import type { AclManager } from '../../../../../src/authorization/AclManager';
import { AclLinkMetadataWriter } from '../../../../../src/ldp/http/metadata/AclLinkMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../../src/ldp/representation/ResourceIdentifier';

describe('An AclLinkMetadataWriter', (): void => {
  const manager = {
    getAclDocument: async(id: ResourceIdentifier): Promise<ResourceIdentifier> => ({ path: `${id.path}.acl` }),
  } as AclManager;
  const identifier = { path: 'http://test.com/foo' };

  it('adds the acl link header.', async(): Promise<void> => {
    const writer = new AclLinkMetadataWriter(manager);
    const response = createResponse();
    const metadata = new RepresentationMetadata(identifier);
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link: `<${identifier.path}.acl>; rel="acl"` });
  });

  it('can use a custom rel attribute.', async(): Promise<void> => {
    const writer = new AclLinkMetadataWriter(manager, 'http://www.w3.org/ns/solid/terms#acl');
    const response = createResponse();
    const metadata = new RepresentationMetadata(identifier);
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link: `<${identifier.path}.acl>; rel="http://www.w3.org/ns/solid/terms#acl"` });
  });
});
