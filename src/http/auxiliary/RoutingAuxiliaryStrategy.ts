import type { Representation } from '../representation/Representation';
import type { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import type { AuxiliaryStrategy } from './AuxiliaryStrategy';
import { RoutingAuxiliaryIdentifierStrategy } from './RoutingAuxiliaryIdentifierStrategy';

/**
 * An {@link AuxiliaryStrategy} that combines multiple AuxiliaryStrategies into one.
 * Uses `isAuxiliaryIdentifier` to know which strategy to call for which call.
 *
 * `addMetadata` will either call all strategies if the input is the subject identifier,
 * or only the matching strategy if the input is an auxiliary identifier.
 */
export class RoutingAuxiliaryStrategy extends RoutingAuxiliaryIdentifierStrategy implements AuxiliaryStrategy {
  protected readonly sources: AuxiliaryStrategy[] = [];

  public constructor(sources: AuxiliaryStrategy[]) {
    super(sources);
    this.sources = sources;
  }

  public usesOwnAuthorization(identifier: ResourceIdentifier): boolean {
    const source = this.getMatchingSource(identifier);
    return source.usesOwnAuthorization(identifier);
  }

  public isRequiredInRoot(identifier: ResourceIdentifier): boolean {
    const source = this.getMatchingSource(identifier);
    return source.isRequiredInRoot(identifier);
  }

  public async addMetadata(metadata: RepresentationMetadata): Promise<void> {
    const identifier = { path: metadata.identifier.value };
    // Make sure unrelated auxiliary strategies don't add metadata to another auxiliary resource
    const match = this.sources.find((source): boolean => source.isAuxiliaryIdentifier(identifier));
    if (match) {
      await match.addMetadata(metadata);
    } else {
      for (const source of this.sources) {
        await source.addMetadata(metadata);
      }
    }
  }

  public async validate(representation: Representation): Promise<void> {
    const identifier = { path: representation.metadata.identifier.value };
    const source = this.getMatchingSource(identifier);
    return source.validate(representation);
  }

  // Updated with new source typings
  protected getMatchingSource(identifier: ResourceIdentifier): AuxiliaryStrategy {
    return super.getMatchingSource(identifier) as AuxiliaryStrategy;
  }
}
