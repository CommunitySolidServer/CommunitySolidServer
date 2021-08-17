import { ACL, FOAF } from '../../util/Vocabularies';
import type { AccessCheckerArgs } from './AccessChecker';
import { AccessChecker } from './AccessChecker';

export class AgentClassAccessChecker extends AccessChecker {
  public async handle({ acl, rule, credentials }: AccessCheckerArgs): Promise<boolean> {
    if (acl.countQuads(rule, ACL.agentClass, FOAF.Agent, null) !== 0) {
      return true;
    }
    if (typeof credentials.webId === 'string') {
      return acl.countQuads(rule, ACL.agentClass, ACL.AuthenticatedAgent, null) !== 0;
    }
    return false;
  }
}
