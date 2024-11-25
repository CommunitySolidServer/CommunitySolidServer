import { DataFactory as DF, Store } from 'n3';
import type { AccessCheckerArgs } from '../../../../src/authorization/access/AccessChecker';
import { AgentClassAccessChecker } from '../../../../src/authorization/access/AgentClassAccessChecker';
import { ACL, FOAF } from '../../../../src/util/Vocabularies';

describe('An AgentClassAccessChecker', (): void => {
  const webId = 'http://test.com/alice/profile/card#me';
  const acl = new Store();
  acl.addQuad(DF.namedNode('agentMatch'), ACL.terms.agentClass, FOAF.terms.Agent);
  acl.addQuad(DF.namedNode('authenticatedMatch'), ACL.terms.agentClass, ACL.terms.AuthenticatedAgent);
  const checker = new AgentClassAccessChecker();

  it('can handle all requests.', async(): Promise<void> => {
    await expect(checker.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('returns true if the rule contains foaf:agent as supported class.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: DF.namedNode('agentMatch'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(true);
  });

  it('returns true for authenticated users with an acl:AuthenticatedAgent rule.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: DF.namedNode('authenticatedMatch'), credentials: { agent: { webId }}};
    await expect(checker.handle(input)).resolves.toBe(true);
  });

  it('returns false for unauthenticated users with an acl:AuthenticatedAgent rule.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: DF.namedNode('authenticatedMatch'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });

  it('returns false if no class rule is found.', async(): Promise<void> => {
    const input: AccessCheckerArgs = { acl, rule: DF.namedNode('noMatch'), credentials: {}};
    await expect(checker.handle(input)).resolves.toBe(false);
  });
});
