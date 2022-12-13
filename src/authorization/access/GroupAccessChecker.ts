import type { NamedNode } from '@rdfjs/types';
import type { Store, Term } from 'n3';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { fetchDataset } from '../../util/FetchUtil';
import { promiseSome } from '../../util/PromiseUtil';
import { readableToQuads } from '../../util/StreamUtil';
import { VCARD } from '../../util/Vocabularies';
import type { AccessCheckerArgs, AccessChecks } from './AccessChecker';
import { accessCheckerGroupPredicates, AccessChecker } from './AccessChecker';

/**
 * Checks if the given identity belongs to a group that has access.
 * Implements the behaviour of groups from the WAC specification.
 */
export class GroupAccessChecker extends AccessChecker {
  private readonly predicate: NamedNode;

  public constructor(type: AccessChecks) {
    super(type);

    this.predicate = accessCheckerGroupPredicates[type];
  }

  public async handle({ acl, rule, credentials }: AccessCheckerArgs): Promise<boolean> {
    const identity = this.getIdentity(credentials);

    if (typeof identity === 'string') {
      const groups = acl.getObjects(rule, this.predicate, null);

      return await promiseSome(groups.map(async(group: Term): Promise<boolean> =>
        this.isMemberOfGroup(identity, group)));
    }

    return false;
  }

  /**
   * Checks if the given identity is member of a given vCard group.
   * @param identity - identity of the entity that needs access.
   * @param group - URL of the vCard group that needs to be checked.
   *
   * @returns If the identity is member of the given vCard group.
   */
  private async isMemberOfGroup(identity: string, group: Term): Promise<boolean> {
    const groupDocument: ResourceIdentifier = { path: /^[^#]*/u.exec(group.value)![0] };

    // Fetch the required vCard group file
    const quads = await this.fetchQuads(groupDocument.path);
    return quads.countQuads(group, VCARD.terms.hasMember, identity, null) !== 0;
  }

  /**
   * Fetches quads from the given URL.
   */
  private async fetchQuads(url: string): Promise<Store> {
    const prom = (async(): Promise<Store> => {
      const representation = await fetchDataset(url);
      return readableToQuads(representation.data);
    })();
    return await prom;
  }
}
