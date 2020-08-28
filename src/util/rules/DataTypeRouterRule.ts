import { Representation } from '../../ldp/representation/Representation';
import { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { FileResourceStore } from '../../storage/FileResourceStore';
import { ResourceStore } from '../../storage/ResourceStore';
import { SparqlResourceStore } from '../../storage/SparqlResourceStore';
import { DATA_TYPE_BINARY, DATA_TYPE_QUAD } from '../ContentTypes';
import { RouterRule } from './RouterRule';

export class DataTypeRouterRule implements RouterRule {
  private readonly fileResourceStore: FileResourceStore;
  private readonly sparqlResourceStore: SparqlResourceStore;

  /**
   * @param fileResourceStore - Instance of FileResourceStore to use.
   * @param sparqlResourceStore - Instance of SparqlResourceStore to use.
   */
  public constructor(fileResourceStore: FileResourceStore, sparqlResourceStore: SparqlResourceStore) {
    this.fileResourceStore = fileResourceStore;
    this.sparqlResourceStore = sparqlResourceStore;
  }

  /**
   * Find the appropriate ResourceStore to which the request should be routed based on the incoming parameters.
   * Looks at the data type to decide.
   * @param identifier - Incoming ResourceIdentifier.
   * @param representation - Optional incoming Representation.
   */
  public getMatchingResourceStore(identifier: ResourceIdentifier, representation?: Representation):
  ResourceStore | undefined {
    if (typeof representation === 'undefined' || typeof representation.dataType === 'undefined') {
      return undefined;
    }
    switch (representation.dataType) {
      case DATA_TYPE_BINARY:
        return this.fileResourceStore;
      case DATA_TYPE_QUAD:
        return this.sparqlResourceStore;
      default:
        return undefined;
    }
  }
}
