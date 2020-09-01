import { Representation } from '../../ldp/representation/Representation';
import { RepresentationPreferences } from '../../ldp/representation/RepresentationPreferences';
import { RepresentationConverter, RepresentationConverterArgs } from './RepresentationConverter';

/**
 * A meta converter that takes an array of other converters as input.
 * It chains these converters based on given intermediate types that are supported by converters on either side.
 */
export class ChainedConverter extends RepresentationConverter {
  private readonly converters: RepresentationConverter[];
  private readonly chainTypes: string[];

  /**
   * Creates the chain of converters based on the input.
   * The list of `converters` needs to be at least 2 long,
   * and `chainTypes` needs to be the same length - 1,
   * as each type at index `i` corresponds to the output type of converter `i`
   * and input type of converter `i+1`.
   * @param converters - The chain of converters.
   * @param chainTypes - The intermediate types of the chain.
   */
  public constructor(converters: RepresentationConverter[], chainTypes: string[]) {
    super();
    if (converters.length < 2) {
      throw new Error('At least 2 converters are required.');
    }
    if (chainTypes.length !== converters.length - 1) {
      throw new Error('1 type is required per converter chain.');
    }
    this.converters = converters;
    this.chainTypes = chainTypes;
  }

  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    // Check if the first converter can handle the input
    const preferences: RepresentationPreferences = { type: [{ value: this.chainTypes[0], weight: 1 }]};
    await this.converters[0].canHandle({ ...input, preferences });

    // Check if the last converter can produce the output
    const representation: Representation = { ...input.representation };
    representation.metadata = { ...input.representation.metadata, contentType: this.chainTypes.slice(-1)[0] };
    await this.converters.slice(-1)[0].canHandle({ ...input, representation });
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    const args = { ...input };
    for (let i = 0; i < this.chainTypes.length; ++i) {
      args.preferences = { type: [{ value: this.chainTypes[i], weight: 1 }]};
      args.representation = await this.converters[i].handle(args);
    }
    return this.converters.slice(-1)[0].handle(args);
  }
}
