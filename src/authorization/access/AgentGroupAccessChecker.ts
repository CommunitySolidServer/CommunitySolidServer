import type { Store, Term } from 'n3';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { fetchDataset } from '../../util/FetchUtil';
import { promiseSome } from '../../util/PromiseUtil';
import { readableToQuads } from '../../util/StreamUtil';
import { ACL, VCARD } from '../../util/Vocabularies';
import type { AccessCheckerArgs } from './AccessChecker';
import { AccessChecker } from './AccessChecker';

/**
 * Checks if the given WebID belongs to a group that has access.
 * Implements the behaviour of groups from the WAC specification.
 */
export class AgentGroupAccessChecker extends AccessChecker {
  public constructor() {
    super();
  }

  public async handle({ acl, rule, credentials }: AccessCheckerArgs): Promise<boolean> {
    if (typeof credentials.agent?.webId === 'string') {
      const { webId } = credentials.agent;
      const groups = acl.getObjects(rule, ACL.terms.agentGroup, null);

      return promiseSome(groups.map(async(group: Term): Promise<boolean> =>
        this.isMemberOfGroup(webId, group)));
    }
    return false;
  }

  /**
   * Checks if the given agent is member of a given vCard group.
   *
   * @param webId - WebID of the agent that needs access.
   * @param group - URL of the vCard group that needs to be checked.
   *
   * @returns If the agent is member of the given vCard group.
   */
  private async isMemberOfGroup(webId: string, group: Term): Promise<boolean> {
    const groupDocument: ResourceIdentifier = { path: /^[^#]*/u.exec(group.value)![0] };

    // Fetch the required vCard group file
    const quads = await this.fetchQuads(groupDocument.path);
    return quads.countQuads(group, VCARD.terms.hasMember, webId, null) !== 0;
  }

  /**
   * Fetches quads from the given URL.
   */
  private async fetchQuads(url: string): Promise<Store> {
    const prom = (async(): Promise<Store> => {
      const representation = await fetchDataset(url);
      return readableToQuads(representation.data);
    })();
    return prom;
  }
}
