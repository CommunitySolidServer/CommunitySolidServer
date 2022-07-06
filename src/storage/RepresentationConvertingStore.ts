import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { Conditions } from './Conditions';
import { PassthroughConverter } from './conversion/PassthroughConverter';
import type { RepresentationConverter } from './conversion/RepresentationConverter';
import { PassthroughStore } from './PassthroughStore';
import type { ResourceStore, ChangeMap } from './ResourceStore';

/**
 * Store that provides (optional) conversion of incoming and outgoing {@link Representation}s.
 */
export class RepresentationConvertingStore<T extends ResourceStore = ResourceStore> extends PassthroughStore<T> {
  protected readonly logger = getLoggerFor(this);

  private readonly inConverter: RepresentationConverter;
  private readonly outConverter: RepresentationConverter;
  private readonly inPreferences: RepresentationPreferences;

  /**
   * TODO: This should take RepresentationPreferences instead of a type string when supported by Components.js.
   */
  public constructor(source: T, options: {
    outConverter?: RepresentationConverter;
    inConverter?: RepresentationConverter;
    inType?: string;
  }) {
    super(source);
    const { inConverter, outConverter, inType } = options;
    this.inConverter = inConverter ?? new PassthroughConverter();
    this.outConverter = outConverter ?? new PassthroughConverter();
    this.inPreferences = !inType ? {} : { type: { [inType]: 1 }};
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    const representation = await super.getRepresentation(identifier, preferences, conditions);
    return this.outConverter.handleSafe({ identifier, representation, preferences });
  }

  public async addResource(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ChangeMap> {
    // We can potentially run into problems here if we convert a turtle document where the base IRI is required,
    // since we don't know the resource IRI yet at this point.
    representation = await this.inConverter.handleSafe({ identifier, representation, preferences: this.inPreferences });
    return this.source.addResource(identifier, representation, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ChangeMap> {
    representation = await this.inConverter.handleSafe({ identifier, representation, preferences: this.inPreferences });
    return this.source.setRepresentation(identifier, representation, conditions);
  }
}
