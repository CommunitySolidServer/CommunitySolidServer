import { WebAclAuthorization } from '../../../src/authorization/WebAclAuthorization';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import { ACL, AUTH } from '../../../src/util/Vocabularies';
import 'jest-rdf';

describe('A WebAclAuthorization', (): void => {
  let authorization: WebAclAuthorization;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    authorization = new WebAclAuthorization(
      {
        read: false,
        append: false,
        write: false,
        control: false,
      },
      {
        read: false,
        append: false,
        write: false,
        control: false,
      },
    );

    metadata = new RepresentationMetadata();
  });

  it('adds no metadata if there are no permissions.', async(): Promise<void> => {
    expect(authorization.addMetadata(metadata)).toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('adds corresponding acl metadata for all permissions present.', async(): Promise<void> => {
    authorization.user.read = true;
    authorization.user.write = true;
    authorization.everyone.read = true;
    expect(authorization.addMetadata(metadata)).toBeUndefined();
    expect(metadata.quads()).toHaveLength(3);
    expect(metadata.getAll(AUTH.terms.userMode)).toEqualRdfTermArray([ ACL.terms.Read, ACL.terms.Write ]);
    expect(metadata.get(AUTH.terms.publicMode)).toEqualRdfTerm(ACL.terms.Read);
  });
});
