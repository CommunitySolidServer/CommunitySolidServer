import type { ValuePreferences } from '../../ldp/representation/RepresentationPreferences';
import { supportsMediaTypeConversion } from './ConversionUtil';
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
   * Verifies whether this converter supports the input.
   */
  public async canHandle(args: RepresentationConverterArgs): Promise<void> {
    const types = [ this.getInputTypes(), this.getOutputTypes() ];
    const { contentType } = args.representation.metadata;
    const [ inputTypes, outputTypes ] = await Promise.all(types);
    supportsMediaTypeConversion(contentType, args.preferences.type, inputTypes, outputTypes);
  }
}
