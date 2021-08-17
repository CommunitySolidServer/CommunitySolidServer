import { ACL } from '../../util/Vocabularies';
import type { AccessCheckerArgs } from './AccessChecker';
import { AccessChecker } from './AccessChecker';

export class AgentAccessChecker extends AccessChecker {
  public async handle({ acl, rule, credentials }: AccessCheckerArgs): Promise<boolean> {
    if (typeof credentials.webId === 'string') {
      return acl.countQuads(rule, ACL.agent, credentials.webId, null) !== 0;
    }
    return false;
  }
}
