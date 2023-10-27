import { DataFactory, Store } from 'n3';
import type { AccessCheckerArgs } from '../../../../src/authorization/access/AccessChecker';
import { AgentGroupAccessChecker } from '../../../../src/authorization/access/AgentGroupAccessChecker';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import * as fetchUtil from '../../../../src/util/FetchUtil';
import { ACL, VCARD } from '../../../../src/util/Vocabularies';

const { namedNode, quad } = DataFactory;

describe('An AgentGroupAccessChecker', (): void => {
  const webId = 'http://test.com/alice/profile/card#me';
  const groupId = 'http://test.com/group';
  const acl = new Store();
  acl.addQuad(namedNode('groupMatch'), ACL.terms.agentGroup, namedNode(groupId));
  acl.addQuad(namedNode('noMatch'), ACL.terms.agentGroup, namedNode('badGroup'));
  let fetchMock: jest.SpyInstance;
  let representation: Representation;
  let checker: AgentGroupAccessChecker;

  beforeEach(async(): Promise<void> => {
    const groupQuads = [ quad(namedNode(groupId), VCARD.terms.hasMember, namedNode(webId)) ];
    representation = new BasicRepresentation(groupQuads, INTERNAL_QUADS, false);
    fetchMock = jest.spyOn(fetchUtil, 'fetchDataset');
    fetchMock.mockResolvedValue(representation);
    fetchMock.mockClear();

    checker = new AgentGroupAccessChecker();
  });

  it('can handle all requests.', async(): Promise<void> => {
    await expect(checker.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('returns true if the WebID is a valid group member.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('groupMatch'), credentials: { agent: { webId }}};
    await expect(checker.handle(input)).resolves.toBe(true);
  });

  it('returns false if the WebID is not a valid group member.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('noMatch'), credentials: { agent: { webId }}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });

  it('returns false if there are no WebID credentials.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('groupMatch'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });
});
