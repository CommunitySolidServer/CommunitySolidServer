import { ACL } from '../../util/Vocabularies';
import type { AccessCheckerArgs } from './AccessChecker';
import { AccessChecker } from './AccessChecker';

/**
 * Checks if the given WebID has been given access.
 */
export class AgentAccessChecker extends AccessChecker {
  public async handle({ acl, rule, credential }: AccessCheckerArgs): Promise<boolean> {
    if (typeof credential.webId === 'string') {
      return acl.countQuads(rule, ACL.terms.agent, credential.webId, null) !== 0;
    }
    return false;
  }
}
