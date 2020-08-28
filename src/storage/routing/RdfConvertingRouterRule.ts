import type { Representation } from '../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import type { RepresentationConverter } from '../conversion/RepresentationConverter';
import type { ResourceStore } from '../ResourceStore';
import type { RouterRule } from './RouterRule';

// TODO:
export class RdfConvertingRouterRule implements RouterRule {
  private readonly rdfStore: ResourceStore;
  private readonly binaryStore: ResourceStore;
  private readonly converter: RepresentationConverter;

  public constructor(rdfStore: ResourceStore, binaryStore: ResourceStore, converter: RepresentationConverter) {
    this.rdfStore = rdfStore;
    this.binaryStore = binaryStore;
    this.converter = converter;
  }

  public async getMatchingResourceStore(identifier: ResourceIdentifier, representation?: Representation):
  Promise<ResourceStore> {
    if (representation) {
      try {
        const preferences = { type: [{ value: INTERNAL_QUADS, weight: 1 }]};
        await this.converter.canHandle({ identifier, representation, preferences });
        return this.rdfStore;
      } catch {
        return this.binaryStore;
      }
    } else {
      // No content-type given so we can only check if one of the stores has data for the identifier
      // Any of the two stores can be used. Using the binary one here since that one would be faster in current cases.
      try {
        const response = await this.binaryStore.getRepresentation(identifier, {});
        response.data.destroy();
        return this.binaryStore;
      } catch {
        return this.rdfStore;
      }
    }
  }
}
