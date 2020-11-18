import type { Representation } from '../../ldp/representation/Representation';
import { getLoggerFor } from '../../logging/LogUtil';
import { validateRequestArgs, matchingMediaType } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * A meta converter that takes an array of other converters as input.
 * It chains these converters by finding intermediate types that are supported by converters on either side.
 */
export class ChainedConverter extends TypedRepresentationConverter {
  protected readonly logger = getLoggerFor(this);

  private readonly converters: TypedRepresentationConverter[];

  /**
   * Creates the chain of converters based on the input.
   * The list of `converters` needs to be at least 2 long.
   * @param converters - The chain of converters.
   */
  public constructor(converters: TypedRepresentationConverter[]) {
    super();
    if (converters.length < 2) {
      throw new Error('At least 2 converters are required.');
    }
    this.converters = [ ...converters ];
  }

  protected get first(): TypedRepresentationConverter {
    return this.converters[0];
  }

  protected get last(): TypedRepresentationConverter {
    return this.converters[this.converters.length - 1];
  }

  public async getInputTypes(): Promise<Record<string, number>> {
    return this.first.getInputTypes();
  }

  public async getOutputTypes(): Promise<Record<string, number>> {
    return this.last.getOutputTypes();
  }

  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    // We assume a chain can be constructed, otherwise there would be a configuration issue
    // So we only check if the input can be parsed and the preferred type can be written
    const inTypes = this.filterTypes(await this.first.getInputTypes());
    const outTypes = this.filterTypes(await this.last.getOutputTypes());
    validateRequestArgs(input, inTypes, outTypes);
  }

  private filterTypes(typeVals: Record<string, number>): string[] {
    return Object.keys(typeVals).filter((name): boolean => typeVals[name] > 0);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    const args = { ...input };
    for (let i = 0; i < this.converters.length - 1; ++i) {
      const value = await this.getMatchingType(this.converters[i], this.converters[i + 1]);
      args.preferences = { type: [{ value, weight: 1 }]};
      args.representation = await this.converters[i].handle(args);
    }
    args.preferences = input.preferences;
    return this.last.handle(args);
  }

  /**
   * Finds the best media type that can be used to chain 2 converters.
   */
  protected async getMatchingType(left: TypedRepresentationConverter, right: TypedRepresentationConverter):
  Promise<string> {
    const leftTypes = await left.getOutputTypes();
    const rightTypes = await right.getInputTypes();
    let bestMatch: { type: string; weight: number } = { type: 'invalid', weight: 0 };

    // Try to find the matching type with the best weight
    const leftKeys = Object.keys(leftTypes);
    const rightKeys = Object.keys(rightTypes);
    for (const leftType of leftKeys) {
      const leftWeight = leftTypes[leftType];
      if (leftWeight <= bestMatch.weight) {
        continue;
      }
      for (const rightType of rightKeys) {
        const rightWeight = rightTypes[rightType];
        const weight = leftWeight * rightWeight;
        if (weight > bestMatch.weight && matchingMediaType(leftType, rightType)) {
          bestMatch = { type: leftType, weight };
          if (weight === 1) {
            this.logger.info(`${bestMatch.type} is an exact match between ${leftKeys} and ${rightKeys}`);
            return bestMatch.type;
          }
        }
      }
    }

    if (bestMatch.weight === 0) {
      this.logger.error(`No match found between ${leftKeys} and ${rightKeys}`);
      throw new Error(`No match found between ${leftKeys} and ${rightKeys}`);
    }

    this.logger.info(`${bestMatch.type} is the best match between ${leftKeys} and ${rightKeys}`);
    return bestMatch.type;
  }
}
