import { InternalServerError } from '../../util/errors/InternalServerError';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import type { AuxiliaryIdentifierStrategy } from './AuxiliaryIdentifierStrategy';

/**
 * Helper class that uses a suffix to determine if a resource is an auxiliary resource or not.
 * Simple string matching is used, so the dot needs to be included if needed, e.g. ".acl".
 */
export class SuffixAuxiliaryIdentifierStrategy implements AuxiliaryIdentifierStrategy {
  protected readonly suffix: string;

  public constructor(suffix: string) {
    if (suffix.length === 0) {
      throw new InternalServerError('Suffix length should be non-zero.');
    }
    this.suffix = suffix;
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
    if (!this.isAuxiliaryIdentifier(identifier)) {
      throw new InternalServerError(`${identifier.path} does not end on ${this.suffix} so no conversion is possible.`);
    }
    return { path: identifier.path.slice(0, -this.suffix.length) };
  }
}
