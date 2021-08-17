import type { Term } from 'n3';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { fetchDataset } from '../../util/FetchUtil';
import { promiseAny } from '../../util/PromiseUtil';
import { readableToQuads } from '../../util/StreamUtil';
import { ACL, VCARD } from '../../util/Vocabularies';
import type { AccessCheckerArgs } from './AccessChecker';
import { AccessChecker } from './AccessChecker';

export class AgentGroupAccessChecker extends AccessChecker {
  private readonly converter: RepresentationConverter;

  public constructor(converter: RepresentationConverter) {
    super();
    this.converter = converter;
  }

  public async handle({ acl, rule, credentials }: AccessCheckerArgs): Promise<boolean> {
    if (typeof credentials.webId === 'string') {
      const { webId } = credentials;
      const groups = acl.getObjects(rule, ACL.agentGroup, null);

      return await promiseAny(groups.map(async(group: Term): Promise<boolean> =>
        this.isMemberOfGroup(webId, group)));
    }
    return false;
  }

  /**
   * Checks if the given agent is member of a given vCard group.
   * @param webId - WebID of the agent that needs access.
   * @param group - URL of the vCard group that needs to be checked.
   *
   * @returns If the agent is member of the given vCard group.
   */
  private async isMemberOfGroup(webId: string, group: Term): Promise<boolean> {
    const groupDocument: ResourceIdentifier = { path: /^[^#]*/u.exec(group.value)![0] };

    // Fetch the required vCard group file
    const dataset = await fetchDataset(groupDocument.path, this.converter);

    const quads = await readableToQuads(dataset.data);
    return quads.countQuads(group, VCARD.hasMember, webId, null) !== 0;
  }
}
