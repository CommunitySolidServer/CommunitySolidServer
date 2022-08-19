import { ACL, FOAF } from '../../util/Vocabularies';
import type { AccessCheckerArgs } from './AccessChecker';
import { AccessChecker } from './AccessChecker';

/**
 * Checks access based on the agent class.
 */
export class AgentClassAccessChecker extends AccessChecker {
  public async handle({ acl, rule, credentials }: AccessCheckerArgs): Promise<boolean> {
    // Check if unauthenticated agents have access
    if (acl.countQuads(rule, ACL.terms.agentClass, FOAF.terms.Agent, null) !== 0) {
      return true;
    }
    // Check if the agent is authenticated and if authenticated agents have access
    if (typeof credentials.agent?.webId === 'string') {
      return acl.countQuads(rule, ACL.terms.agentClass, ACL.terms.AuthenticatedAgent, null) !== 0;
    }
    return false;
  }
}
