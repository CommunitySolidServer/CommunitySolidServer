import { DataFactory as DF, Store } from 'n3';
import type { AccessCheckerArgs } from '../../../../src/authorization/access/AccessChecker';
import { AgentAccessChecker } from '../../../../src/authorization/access/AgentAccessChecker';
import { ACL } from '../../../../src/util/Vocabularies';

describe('A AgentAccessChecker', (): void => {
  const webId = 'http://test.com/alice/profile/card#me';
  const acl = new Store();
  acl.addQuad(DF.namedNode('match'), ACL.terms.agent, DF.namedNode(webId));
  acl.addQuad(DF.namedNode('noMatch'), ACL.terms.agent, DF.namedNode('http://test.com/bob'));
  const checker = new AgentAccessChecker();

  it('can handle all requests.', async(): Promise<void> => {
    await expect(checker.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('returns true if a match is found for the given WebID.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: DF.namedNode('match'), credentials: { agent: { webId }}};
    await expect(checker.handle(input)).resolves.toBe(true);
  });

  it('returns false if no match is found.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: DF.namedNode('noMatch'), credentials: { agent: { webId }}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });

  it('returns false if the credentials contain no WebID.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: DF.namedNode('match'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });
});
