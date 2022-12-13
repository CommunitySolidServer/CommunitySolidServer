import { DataFactory, Store } from 'n3';
import type { Credentials } from '../../../../src/authentication/Credentials';
import type { AccessCheckerArgs } from '../../../../src/authorization/access/AccessChecker';
import { accessCheckerGroupPredicates, AccessChecks } from '../../../../src/authorization/access/AccessChecker';
import { GroupAccessChecker } from '../../../../src/authorization/access/GroupAccessChecker';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import * as fetchUtil from '../../../../src/util/FetchUtil';
import { VCARD } from '../../../../src/util/Vocabularies';

const { namedNode, quad } = DataFactory;

function generateCredentials(identity: string, type: AccessChecks): Credentials {
  switch (type) {
    case AccessChecks.agent: return { agent: { webId: identity }};
    case AccessChecks.client: return { client: { clientId: identity }};
    case AccessChecks.issuer: return { issuer: { url: identity }};
    // No default
  }
}

describe.each(Object.values(AccessChecks))('A GroupAccessChecker on %s', (type: AccessChecks): void => {
  const identity = 'http://test.com/alice/profile/card#me';
  const groupId = 'http://test.com/group';
  const acl = new Store();
  acl.addQuad(namedNode('groupMatch'), accessCheckerGroupPredicates[type], namedNode(groupId));
  acl.addQuad(namedNode('noMatch'), accessCheckerGroupPredicates[type], namedNode('badGroup'));
  let fetchMock: jest.SpyInstance;
  let representation: Representation;
  let checker: GroupAccessChecker;

  beforeEach(async(): Promise<void> => {
    const groupQuads = [ quad(namedNode(groupId), VCARD.terms.hasMember, namedNode(identity)) ];
    representation = new BasicRepresentation(groupQuads, INTERNAL_QUADS, false);
    fetchMock = jest.spyOn(fetchUtil, 'fetchDataset');
    fetchMock.mockResolvedValue(representation);
    fetchMock.mockClear();

    checker = new GroupAccessChecker(type);
  });

  it('can handle all requests.', async(): Promise<void> => {
    await expect(checker.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('returns true if the entity is a valid group member.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl,
      rule: namedNode('groupMatch'),
      credentials: generateCredentials(identity, type) };
    await expect(checker.handle(input)).resolves.toBe(true);
  });

  it('returns false if the entity is not a valid group member.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl,
      rule: namedNode('noMatch'),
      credentials: generateCredentials(identity, type) };
    await expect(checker.handle(input)).resolves.toBe(false);
  });

  it('returns false if there are no credentials of the type.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('groupMatch'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });
});

