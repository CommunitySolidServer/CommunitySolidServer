import type { ValuePreferences } from '../../http/representation/RepresentationPreferences';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { PromiseOrValue } from '../../util/PromiseUtil';
import { getConversionTarget, getTypeWeight, preferencesToString } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

type ValuePreferencesArg =
  PromiseOrValue<string> |
  PromiseOrValue<string[]> |
  PromiseOrValue<ValuePreferences>;

async function toValuePreferences(arg: ValuePreferencesArg): Promise<ValuePreferences> {
  const resolved = await arg;
  if (typeof resolved === 'string') {
    return { [resolved]: 1 };
  }
  if (Array.isArray(resolved)) {
    return Object.fromEntries(resolved.map((type): [string, number] => [ type, 1 ]));
  }
  return resolved;
}

/**
 * A base {@link TypedRepresentationConverter} implementation for converters
 * that can convert from all its input types to all its output types.
 *
 * This base class handles the `canHandle` call by comparing the input content type to the stored input types
 * and the output preferences to the stored output types.
 *
 * Output weights are determined by multiplying all stored output weights with the weight of the input type.
 */
export abstract class BaseTypedRepresentationConverter extends TypedRepresentationConverter {
  protected inputTypes: Promise<ValuePreferences>;
  protected outputTypes: Promise<ValuePreferences>;

  public constructor(inputTypes: ValuePreferencesArg, outputTypes: ValuePreferencesArg) {
    super();
    this.inputTypes = toValuePreferences(inputTypes);
    this.outputTypes = toValuePreferences(outputTypes);
  }

  /**
   * Matches all inputs to all outputs.
   */
  public async getOutputTypes(contentType: string): Promise<ValuePreferences> {
    const weight = getTypeWeight(contentType, await this.inputTypes);
    if (weight > 0) {
      const outputTypes = { ...await this.outputTypes };
      for (const [ key, value ] of Object.entries(outputTypes)) {
        outputTypes[key] = value * weight;
      }
      return outputTypes;
    }
    return {};
  }

  /**
   * Determines whether the given conversion request is supported,
   * given the available content type conversions:
   *  - Checks if there is a content type for the input.
   *  - Checks if the input type is supported by the parser.
   *  - Checks if the parser can produce one of the preferred output types.
   * Throws an error with details if conversion is not possible.
   */
  public async canHandle(args: RepresentationConverterArgs): Promise<void> {
    const { contentType } = args.representation.metadata;

    if (!contentType) {
      throw new NotImplementedHttpError('Can not convert data without a Content-Type.');
    }

    const outputTypes = await this.getOutputTypes(contentType);
    const outputPreferences = args.preferences.type ?? {};
    if (!getConversionTarget(outputTypes, outputPreferences)) {
      throw new NotImplementedHttpError(
        `Cannot convert from ${contentType} to ${preferencesToString(outputPreferences)
        }, only to ${preferencesToString(outputTypes)}.`,
      );
    }
  }
}
