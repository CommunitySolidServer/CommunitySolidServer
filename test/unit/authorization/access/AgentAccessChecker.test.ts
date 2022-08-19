import { DataFactory, Store } from 'n3';
import type { AccessCheckerArgs } from '../../../../src/authorization/access/AccessChecker';
import { AgentAccessChecker } from '../../../../src/authorization/access/AgentAccessChecker';
import { ACL } from '../../../../src/util/Vocabularies';
import namedNode = DataFactory.namedNode;

describe('A AgentAccessChecker', (): void => {
  const webId = 'http://test.com/alice/profile/card#me';
  const acl = new Store();
  acl.addQuad(namedNode('match'), ACL.terms.agent, namedNode(webId));
  acl.addQuad(namedNode('noMatch'), ACL.terms.agent, namedNode('http://test.com/bob'));
  const checker = new AgentAccessChecker();

  it('can handle all requests.', async(): Promise<void> => {
    await expect(checker.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('returns true if a match is found for the given WebID.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('match'), credentials: { agent: { webId }}};
    await expect(checker.handle(input)).resolves.toBe(true);
  });

  it('returns false if no match is found.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('noMatch'), credentials: { agent: { webId }}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });

  it('returns false if the credentials contain no WebID.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: namedNode('match'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });
});
