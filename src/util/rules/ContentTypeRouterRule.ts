import { Representation } from '../../ldp/representation/Representation';
import { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { ResourceStore } from '../../storage/ResourceStore';
import { SparqlResourceStore } from '../../storage/SparqlResourceStore';
import { CONTENT_TYPE_QUADS } from '../ContentTypes';
import { RouterRule } from './RouterRule';

export class ContentTypeRouterRule implements RouterRule {
  private readonly sparqlResourceStore: SparqlResourceStore;

  /**
   * @param sparqlResourceStore - Instance of SparqlResourceStore to use.
   */
  public constructor(sparqlResourceStore: SparqlResourceStore) {
    this.sparqlResourceStore = sparqlResourceStore;
  }

  /**
   * Find the appropriate ResourceStore to which the request should be routed based on the incoming parameters.
   * Looks at the content type to decide.
   * @param identifier - Incoming ResourceIdentifier.
   * @param representation - Optional incoming Representation.
   */
  public getMatchingResourceStore(identifier: ResourceIdentifier, representation?: Representation):
  ResourceStore | undefined {
    if (typeof representation === 'undefined' || typeof representation.metadata.contentType === 'undefined') {
      return undefined;
    }
    switch (representation.metadata.contentType) {
      case CONTENT_TYPE_QUADS:
        return this.sparqlResourceStore;
      default:
        return undefined;
    }
  }
}
