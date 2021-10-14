import type { Readable } from 'stream';
import { Validator } from '../../http/auxiliary/Validator';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';

export type DataValidatorInput = {
  identifier: ResourceIdentifier;
  data: Guarded<Readable>;
  metadata: RepresentationMetadata;
};

export abstract class DataValidator extends Validator<DataValidatorInput, Guarded<Readable>> { }
