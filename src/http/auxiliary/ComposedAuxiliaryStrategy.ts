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
  private readonly ownAuthorization: boolean;
  private readonly requiredInRoot: boolean;

  public constructor(
    identifierStrategy: AuxiliaryIdentifierStrategy,
    metadataGenerator?: MetadataGenerator,
    validator?: Validator,
    ownAuthorization = false,
    requiredInRoot = false,
  ) {
    this.identifierStrategy = identifierStrategy;
    this.metadataGenerator = metadataGenerator;
    this.validator = validator;
    this.ownAuthorization = ownAuthorization;
    this.requiredInRoot = requiredInRoot;
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

  public getSubjectIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return this.identifierStrategy.getSubjectIdentifier(identifier);
  }

  public usesOwnAuthorization(): boolean {
    return this.ownAuthorization;
  }

  public isRequiredInRoot(): boolean {
    return this.requiredInRoot;
  }

  public async addMetadata(metadata: RepresentationMetadata): Promise<void> {
    if (this.metadataGenerator) {
      return this.metadataGenerator.handleSafe(metadata);
    }
  }

  public async validate(representation: Representation): Promise<void> {
    if (this.validator) {
      await this.validator.handleSafe({
        representation,
        identifier: { path: representation.metadata.identifier.value },
      });
    }
  }
}
