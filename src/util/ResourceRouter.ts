import { Representation } from '../ldp/representation/Representation';
import { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ResourceStore } from '../storage/ResourceStore';
import { RouterRule } from './rules/RouterRule';

export class ResourceRouter {
  private readonly rules: RouterRule[];

  /**
   * @param rules - Rules to be used. First rule has highest priority.
   */
  public constructor(rules: RouterRule[]) {
    this.rules = rules;
  }

  /**
   * Find the appropriate ResourceStore to which the request should be routed based on the incoming parameters.
   * @param identifier - Incoming ResourceIdentifier.
   * @param representation - Optional incoming Representation.
   * @param preferences - Optional incoming RepresentationPreferences.
   *
   * @throws {@link Error}
   * If no appropriate ResourceStore could be found.
   */
  public findResourceStore(identifier: ResourceIdentifier, representation?: Representation,
    preferences?: RepresentationPreferences): ResourceStore {
    let resourceStore: ResourceStore | undefined;
    let i = 0;
    while (i < this.rules.length && typeof resourceStore === 'undefined') {
      resourceStore = this.rules[i].getMatchingResourceStore(identifier, representation, preferences);
      i += 1;
    }
    if (typeof resourceStore === 'undefined') {
      throw new Error('Cannot find a suitable ResourceStore for the incoming request.');
    }
    return resourceStore;
  }
}
