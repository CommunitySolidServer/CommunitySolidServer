import { DataFactory } from 'n3';
import type { AuxiliaryStrategy, RepresentationMetadata, ResourceIdentifier } from '../../src';
import namedNode = DataFactory.namedNode;

export class SimpleSuffixStrategy implements AuxiliaryStrategy {
  private readonly suffix: string;

  public constructor(suffix: string) {
    this.suffix = suffix;
  }

  public usesOwnAuthorization(): boolean {
    return true;
  }

  public getAuxiliaryIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}${this.suffix}` };
  }

  public getAuxiliaryIdentifiers(identifier: ResourceIdentifier): ResourceIdentifier[] {
    return [ this.getAuxiliaryIdentifier(identifier) ];
  }

  public isAuxiliaryIdentifier(identifier: ResourceIdentifier): boolean {
    return identifier.path.endsWith(this.suffix);
  }

  public getSubjectIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: identifier.path.slice(0, -this.suffix.length) };
  }

  public isRequiredInRoot(): boolean {
    return false;
  }

  public async addMetadata(metadata: RepresentationMetadata): Promise<void> {
    const identifier = { path: metadata.identifier.value };
    // Random triple to test on
    metadata.add(namedNode('AUXILIARY'), this.getAuxiliaryIdentifier(identifier).path);
  }

  public async validate(): Promise<void> {
    // Always validates
  }
}
