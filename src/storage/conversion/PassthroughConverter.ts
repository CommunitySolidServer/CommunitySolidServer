import type { Representation } from '../../http/representation/Representation';
import { RepresentationConverter } from './RepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * A {@link RepresentationConverter} that does not perform any conversion.
 */
export class PassthroughConverter extends RepresentationConverter {
  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    return representation;
  }
}
