import 'jest-rdf';
import { CredentialGroup } from '../../../../../src/authentication/Credentials';
import type { AclPermission } from '../../../../../src/authorization/permissions/AclPermission';
import { WebAclMetadataCollector } from '../../../../../src/http/ldp/metadata/WebAclMetadataCollector';
import type { Operation } from '../../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import { ACL, AUTH } from '../../../../../src/util/Vocabularies';

describe('A WebAclMetadataCollector', (): void => {
  let operation: Operation;
  let metadata: RepresentationMetadata;
  const writer = new WebAclMetadataCollector();

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: 'http://test.com/foo' },
      preferences: {},
      body: new BasicRepresentation(),
    };

    metadata = new RepresentationMetadata();
  });

  it('adds no metadata if there are no permissions.', async(): Promise<void> => {
    await expect(writer.handle({ metadata, operation })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);

    operation.permissionSet = {};
    await expect(writer.handle({ metadata, operation })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('adds no metadata if the method is wrong.', async(): Promise<void> => {
    operation.permissionSet = { [CredentialGroup.public]: { read: true, write: false }};
    operation.method = 'DELETE';
    await expect(writer.handle({ metadata, operation })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('adds corresponding metadata for all permissions present.', async(): Promise<void> => {
    operation.permissionSet = {
      [CredentialGroup.agent]: { read: true, write: true, control: false } as AclPermission,
      [CredentialGroup.public]: { read: true, write: false },
    };
    await expect(writer.handle({ metadata, operation })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(3);
    expect(metadata.getAll(AUTH.terms.userMode)).toEqualRdfTermArray([ ACL.terms.Read, ACL.terms.Write ]);
    expect(metadata.get(AUTH.terms.publicMode)).toEqualRdfTerm(ACL.terms.Read);
  });

  it('ignores unknown modes.', async(): Promise<void> => {
    operation.permissionSet = {
      [CredentialGroup.agent]: { read: true, create: true },
      [CredentialGroup.public]: { read: true },
    };
    await expect(writer.handle({ metadata, operation })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(2);
    expect(metadata.getAll(AUTH.terms.userMode)).toEqualRdfTermArray([ ACL.terms.Read ]);
    expect(metadata.get(AUTH.terms.publicMode)).toEqualRdfTerm(ACL.terms.Read);
  });
});
