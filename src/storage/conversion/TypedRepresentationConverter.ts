import type { ValuePreferences } from '../../ldp/representation/RepresentationPreferences';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { getConversionTarget, getTypeWeight } from './ConversionUtil';
import { RepresentationConverter } from './RepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

type PromiseOrValue<T> = T | Promise<T>;
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
 * A {@link RepresentationConverter} that allows requesting the supported types.
 */
export abstract class TypedRepresentationConverter extends RepresentationConverter {
  protected inputTypes: Promise<ValuePreferences>;
  protected outputTypes: Promise<ValuePreferences>;

  public constructor(inputTypes: ValuePreferencesArg = {}, outputTypes: ValuePreferencesArg = {}) {
    super();
    this.inputTypes = toValuePreferences(inputTypes);
    this.outputTypes = toValuePreferences(outputTypes);
  }

  /**
   * Gets the supported input content types for this converter, mapped to a numerical priority.
   */
  public async getInputTypes(): Promise<ValuePreferences> {
    return this.inputTypes;
  }

  /**
   * Gets the supported output content types for this converter, mapped to a numerical quality.
   */
  public async getOutputTypes(): Promise<ValuePreferences> {
    return this.outputTypes;
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
    const types = [ this.getInputTypes(), this.getOutputTypes() ];
    const { contentType } = args.representation.metadata;

    if (!contentType) {
      throw new NotImplementedHttpError('Can not convert data without a Content-Type.');
    }

    const [ inputTypes, outputTypes ] = await Promise.all(types);
    const outputPreferences = args.preferences.type ?? {};
    if (getTypeWeight(contentType, inputTypes) === 0 || !getConversionTarget(outputTypes, outputPreferences)) {
      throw new NotImplementedHttpError(
        `Cannot convert from ${contentType} to ${Object.keys(outputPreferences)
        }, only from ${Object.keys(inputTypes)} to ${Object.keys(outputTypes)}.`,
      );
    }
  }
}
