import type { Representation } from '../representation/Representation';
import type { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import type { AuxiliaryIdentifierStrategy } from './AuxiliaryIdentifierStrategy';
import type { AuxiliaryStrategy } from './AuxiliaryStrategy';
import type { MetadataGenerator } from './MetadataGenerator';
import type { Validator } from './Validator';

/**
 * An {@link AuxiliaryStrategy} that provides its functionality through the combination of
 * an {@link AuxiliaryIdentifierStrategy}, {@link MetadataGenerator} and {@link Validator}.
 */
export class ComposedAuxiliaryStrategy implements AuxiliaryStrategy {
  private readonly identifierStrategy: AuxiliaryIdentifierStrategy;
  private readonly metadataGenerator?: MetadataGenerator;
  private readonly validator?: Validator;
  private readonly rootRequired: boolean;

  public constructor(identifierStrategy: AuxiliaryIdentifierStrategy, metadataGenerator?: MetadataGenerator,
    validator?: Validator, isRootRequired = false) {
    this.identifierStrategy = identifierStrategy;
    this.metadataGenerator = metadataGenerator;
    this.validator = validator;
    this.rootRequired = isRootRequired;
  }

  public getAuxiliaryIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return this.identifierStrategy.getAuxiliaryIdentifier(identifier);
  }

  public getAuxiliaryIdentifiers(identifier: ResourceIdentifier): ResourceIdentifier[] {
    return this.identifierStrategy.getAuxiliaryIdentifiers(identifier);
  }

  public isAuxiliaryIdentifier(identifier: ResourceIdentifier): boolean {
    return this.identifierStrategy.isAuxiliaryIdentifier(identifier);
  }

  public getAssociatedIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return this.identifierStrategy.getAssociatedIdentifier(identifier);
  }

  public isRootRequired(): boolean {
    return this.rootRequired;
  }

  public async addMetadata(metadata: RepresentationMetadata): Promise<void> {
    if (this.metadataGenerator) {
      return this.metadataGenerator.handleSafe(metadata);
    }
  }

  public async validate(representation: Representation): Promise<void> {
    if (this.validator) {
      return this.validator.handleSafe(representation);
    }
  }
}
