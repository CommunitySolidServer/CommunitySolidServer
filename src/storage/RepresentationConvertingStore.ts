import type { AuxiliaryStrategy } from '../http/auxiliary/AuxiliaryStrategy';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import type { Conditions } from './conditions/Conditions';
import { PassthroughConverter } from './conversion/PassthroughConverter';
import type { RepresentationConverter } from './conversion/RepresentationConverter';
import { PassthroughStore } from './PassthroughStore';
import type { ChangeMap, ResourceStore } from './ResourceStore';

/**
 * Store that provides (optional) conversion of incoming and outgoing {@link Representation}s.
 */
export class RepresentationConvertingStore<T extends ResourceStore = ResourceStore> extends PassthroughStore<T> {
  protected readonly logger = getLoggerFor(this);

  private readonly metadataStrategy: AuxiliaryStrategy;
  private readonly inConverter: RepresentationConverter;
  private readonly outConverter: RepresentationConverter;
  private readonly inPreferences: RepresentationPreferences;

  /**
   * @param source - Store we retrieve data from and send data to.
   * @param metadataStrategy - Used to distinguish regular resources (which may be converted)
   *                           from metadata resources (which always need conversion).
   * @param options - Determines when data should be converted.
   * @param options.outConverter - Converts data after retrieval from the source store.
   * @param options.inConverter - Converts data before passing to the source store.
   * @param options.inPreferences - The preferred input format for the source store, as passed to the inConverter.
   */
  public constructor(source: T, metadataStrategy: AuxiliaryStrategy, options: {
    outConverter?: RepresentationConverter;
    inConverter?: RepresentationConverter;
    inPreferences?: RepresentationPreferences;
  }) {
    super(source);
    const { inConverter, outConverter, inPreferences } = options;
    this.metadataStrategy = metadataStrategy;
    this.inConverter = inConverter ?? new PassthroughConverter();
    this.outConverter = outConverter ?? new PassthroughConverter();
    this.inPreferences = inPreferences ?? {};
  }

  public async getRepresentation(
    identifier: ResourceIdentifier,
    preferences: RepresentationPreferences,
    conditions?: Conditions,
  ): Promise<Representation> {
    const representation = await super.getRepresentation(identifier, preferences, conditions);
    return this.outConverter.handleSafe({ identifier, representation, preferences });
  }

  public async addResource(
    identifier: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    // In case of containers, no content-type is required and the representation is not used.
    if (representation.metadata.contentType) {
      // We can potentially run into problems here if we convert a turtle document where the base IRI is required,
      // since we don't know the resource IRI yet at this point.
      representation = await this.inConverter.handleSafe(
        { identifier, representation, preferences: this.inPreferences },
      );
    }
    return this.source.addResource(identifier, representation, conditions);
  }

  public async setRepresentation(
    identifier: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    // When it is a metadata resource, convert it to Quads as those are expected in the later stores
    if (this.metadataStrategy.isAuxiliaryIdentifier(identifier)) {
      representation = await this.inConverter.handleSafe(
        { identifier, representation, preferences: { type: { [INTERNAL_QUADS]: 1 }}},
      );
    } else if (representation.metadata.contentType) {
      representation = await this.inConverter.handleSafe(
        { identifier, representation, preferences: this.inPreferences },
      );
    }
    return this.source.setRepresentation(identifier, representation, conditions);
  }
}
