import 'jest-rdf';
import { CredentialGroup } from '../../../../../src/authentication/Credentials';
import { WebAclMetadataCollector } from '../../../../../src/ldp/operations/metadata/WebAclMetadataCollector';
import type { Operation } from '../../../../../src/ldp/operations/Operation';
import { RepresentationMetadata } from '../../../../../src/ldp/representation/RepresentationMetadata';
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
      [CredentialGroup.agent]: { read: true, write: true, control: false },
      [CredentialGroup.public]: { read: true, write: false },
    };
    await expect(writer.handle({ metadata, operation })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(3);
    expect(metadata.getAll(AUTH.terms.userMode)).toEqualRdfTermArray([ ACL.terms.Read, ACL.terms.Write ]);
    expect(metadata.get(AUTH.terms.publicMode)).toEqualRdfTerm(ACL.terms.Read);
  });
});
