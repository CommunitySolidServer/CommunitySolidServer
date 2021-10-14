import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import type { AuxiliaryIdentifierStrategy } from './AuxiliaryIdentifierStrategy';

/**
 * An {@link AuxiliaryIdentifierStrategy} that combines multiple AuxiliaryIdentifierStrategies into one.
 * Uses `isAuxiliaryIdentifier` to know which strategy to route to.
 */
export class RoutingAuxiliaryIdentifierStrategy implements AuxiliaryIdentifierStrategy {
  protected readonly sources: AuxiliaryIdentifierStrategy[];

  public constructor(sources: AuxiliaryIdentifierStrategy[]) {
    this.sources = sources;
  }

  public getAuxiliaryIdentifier(): never {
    throw new InternalServerError(
      'RoutingAuxiliaryIdentifierStrategy has multiple auxiliary strategies and thus no single auxiliary identifier.',
    );
  }

  public getAuxiliaryIdentifiers(identifier: ResourceIdentifier): ResourceIdentifier[] {
    return this.sources.flatMap((source): ResourceIdentifier[] => source.getAuxiliaryIdentifiers(identifier));
  }

  public isAuxiliaryIdentifier(identifier: ResourceIdentifier): boolean {
    return this.sources.some((source): boolean => source.isAuxiliaryIdentifier(identifier));
  }

  public getSubjectIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    const source = this.getMatchingSource(identifier);
    return source.getSubjectIdentifier(identifier);
  }

  protected getMatchingSource(identifier: ResourceIdentifier): AuxiliaryIdentifierStrategy {
    const match = this.sources.find((source): boolean => source.isAuxiliaryIdentifier(identifier));
    if (!match) {
      throw new NotImplementedHttpError(`Could not find an AuxiliaryManager for ${identifier.path}`);
    }

    return match;
  }
}
