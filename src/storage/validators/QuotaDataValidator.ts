import type { Readable } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { QuotaStrategy } from '../quota-strategy/QuotaStrategy';
import type { DataValidator } from './DataValidator';

export class QuotaDataValidator implements DataValidator {
  private readonly strategy: QuotaStrategy;

  public constructor(strategy: QuotaStrategy) {
    this.strategy = strategy;
  }

  public async validateRepresentation(
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ): Promise<Guarded<Readable>> {
    return data;
  }
}
