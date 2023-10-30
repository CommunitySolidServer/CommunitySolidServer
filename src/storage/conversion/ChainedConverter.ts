import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ValuePreferences } from '../../http/representation/RepresentationPreferences';
import { getLoggerFor } from '../../logging/LogUtil';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { POSIX } from '../../util/Vocabularies';
import { cleanPreferences, getBestPreference, getTypeWeight, preferencesToString } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { RepresentationConverter } from './RepresentationConverter';
import type { TypedRepresentationConverter } from './TypedRepresentationConverter';

type ConverterPreference = {
  converter: TypedRepresentationConverter;
  inType: string;
  outTypes: ValuePreferences;
};

type ConversionPath = {
  /**
   * List of converters used in the path.
   */
  converters: TypedRepresentationConverter[];
  /**
   * The intermediate conversion types when going from converter i to i+1.
   * Length is one less than the list of converters.
   */
  intermediateTypes: string[];
  /**
   * The type on which this conversion path starts.
   */
  inType: string;
  /**
   * The types this path can generate.
   * Weights indicate the quality of transforming to that specific type.
   */
  outTypes: ValuePreferences;
  /**
   * The weight of the path matched against the output preferences.
   * Will be 0 if the path does not match any of those preferences.
   */
  weight: number;
  /**
   * The output type for which this path has the highest weight.
   * Value is irrelevant if weight is 0.
   */
  outType: string;
};

/**
 * A meta converter that takes an array of other converters as input.
 * It chains these converters by finding a path of converters
 * that can go from the given content-type to the given type preferences.
 * In case there are multiple paths, the one with the highest weight gets found.
 * Will error in case no path can be found.
 *
 * This is not a TypedRepresentationConverter since the supported output types
 * might depend on what is the input content-type.
 *
 * This converter should be the last in a WaterfallHandler if there are multiple,
 * since it will try to convert any representation with a content-type.
 *
 * Some suggestions on how this class can be even more optimized should this ever be needed in the future.
 * Most of these decrease computation time at the cost of more memory.
 *  - The algorithm could start on both ends of a possible path and work towards the middle.
 *  - When creating a path, store the list of unused converters instead of checking every step.
 *  - Caching: https://github.com/CommunitySolidServer/CommunitySolidServer/issues/832
 *  - Making sure each intermediate type is only used once.
 *  - The TypedRepresentationConverter interface could potentially be updated
 *    so paths only differing in intermediate types can be combined.
 */
export class ChainedConverter extends RepresentationConverter {
  protected readonly logger = getLoggerFor(this);

  private readonly converters: TypedRepresentationConverter[];

  public constructor(converters: TypedRepresentationConverter[]) {
    super();
    if (converters.length === 0) {
      throw new Error('At least 1 converter is required.');
    }
    this.converters = [ ...converters ];
  }

  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    const type = input.representation.metadata.contentType;
    if (!type) {
      throw new BadRequestHttpError('Missing Content-Type header.');
    }
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    const match = await this.findPath(input);

    this.logger.debug(`Converting ${match.inType} -> ${[ ...match.intermediateTypes, match.outType ].join(' -> ')}.`);

    const args = { ...input };
    const outTypes = [ ...match.intermediateTypes, match.outType ];
    for (let i = 0; i < match.converters.length; ++i) {
      args.preferences = { type: { [outTypes[i]]: 1 }};
      args.representation = await match.converters[i].handle(args);
    }

    // For now, we assume any kind of conversion invalidates the stored byte length.
    // In the future, we could let converters handle this individually, as some might know the size of the result.
    if (match.converters.length > 0) {
      args.representation.metadata.removeAll(POSIX.terms.size);
    }

    return args.representation;
  }

  /**
   * Finds a conversion path that can handle the given input.
   */
  private async findPath(input: RepresentationConverterArgs): Promise<ConversionPath> {
    const type = input.representation.metadata.contentType!;
    const preferences = cleanPreferences(input.preferences.type);

    return this.generatePath(type, preferences, input.representation.metadata);
  }

  /**
   * Tries to generate the optimal `ConversionPath` that supports the given parameters,
   * which will then be used to instantiate a specific `MatchedPath` for those parameters.
   *
   * Errors if such a path does not exist.
   */
  private async generatePath(inType: string, outPreferences: ValuePreferences, metadata: RepresentationMetadata):
  Promise<ConversionPath> {
    //
    const weight = getTypeWeight(inType, outPreferences);
    let paths: ConversionPath[] = [{
      converters: [],
      intermediateTypes: [],
      inType,
      outTypes: { [inType]: 1 },
      weight,
      outType: inType,
    }];

    // It's impossible for a path to have a higher weight than this value
    const maxWeight = Math.max(...Object.values(outPreferences));

    // This metadata will be used to simulate canHandle checks
    const metadataPlaceholder = new RepresentationMetadata(metadata);

    let bestPath = this.findBest(paths);
    // This will always stop at some point since paths can't have the same converter twice
    while (paths.length > 0) {
      // For every path, find all the paths that can be made by adding 1 more converter
      const promises = paths.map(async(path): Promise<ConversionPath[]> => this.takeStep(path, metadataPlaceholder));
      paths = (await Promise.all(promises)).flat();
      this.updatePathWeights(paths, outPreferences);
      const newBest = this.findBest(paths);
      if (newBest && (!bestPath || newBest.weight > bestPath.weight)) {
        bestPath = newBest;
      }
      paths = this.removeBadPaths(paths, maxWeight, bestPath);
    }

    if (!bestPath) {
      this.logger.warn(`No conversion path could be made from ${inType} to ${preferencesToString(outPreferences)}.`);
      throw new NotImplementedHttpError(
        `No conversion path could be made from ${inType} to ${preferencesToString(outPreferences)}.`,
      );
    }
    return bestPath;
  }

  /**
   * Checks if a path can match the requested preferences and updates the type and weight if it can.
   */
  private updatePathWeights(paths: ConversionPath[], outPreferences: ValuePreferences): void {
    for (const path of paths) {
      const outMatch = getBestPreference(path.outTypes, outPreferences);
      if (outMatch && outMatch.weight > 0) {
        path.weight = outMatch.weight;
        path.outType = outMatch.value;
      }
    }
  }

  /**
   * Finds the path from the given list that can convert to the given preferences.
   * If there are multiple matches the one with the highest result weight gets chosen.
   * Will return undefined if there are no matches.
   */
  private findBest(paths: ConversionPath[]): ConversionPath | undefined {
    let best: ConversionPath | undefined;
    for (const path of paths) {
      if (path.weight > 0 && !(best && best.weight >= path.weight)) {
        best = path;
      }
    }
    return best;
  }

  /**
   * Filter out paths that can no longer be better than the current best solution.
   * This depends on a valid path already being found, if not all the input paths will be returned.
   *
   * @param paths - Paths to filter.
   * @param maxWeight - The maximum weight in the output preferences.
   * @param bestMatch - The current best path.
   */
  private removeBadPaths(paths: ConversionPath[], maxWeight: number, bestMatch?: ConversionPath): ConversionPath[] {
    // All paths are still good if there is no best match yet
    if (!bestMatch) {
      return paths;
    }
    // Do not improve if the maximum weight has been achieved (accounting for floating point errors)
    if (bestMatch.weight >= maxWeight - 0.01) {
      return [];
    }

    // Only return paths that can potentially improve upon bestPath
    return paths.filter((path): boolean => {
      const optimisticWeight = Math.max(...Object.values(path.outTypes)) * maxWeight;
      return optimisticWeight > bestMatch.weight;
    });
  }

  /**
   * Finds all converters that could take the output of the given path as input.
   * For each of these converters a new path gets created which is the input path appended by the converter.
   */
  private async takeStep(path: ConversionPath, metadata: RepresentationMetadata): Promise<ConversionPath[]> {
    const unusedConverters = this.converters.filter((converter): boolean => !path.converters.includes(converter));
    const nextConverters = await this.supportedConverters(path.outTypes, metadata, unusedConverters);

    // Create a new path for every converter that can be appended
    return Promise.all(nextConverters.map(async(pref): Promise<ConversionPath> => ({
      converters: [ ...path.converters, pref.converter ],
      intermediateTypes: path.converters.length > 0 ? [ ...path.intermediateTypes, pref.inType ] : [],
      inType: path.inType,
      outTypes: pref.outTypes,
      // These will be updated later
      weight: 0,
      outType: 'invalid',
    })));
  }

  /**
   * Creates a new ValuePreferences object, which is equal to the input object
   * with all values multiplied by the given weight.
   */
  private modifyTypeWeights(weight: number, types: ValuePreferences): ValuePreferences {
    return Object.fromEntries(Object.entries(types).map(([ type, pref ]): [string, number] => [ type, weight * pref ]));
  }

  /**
   * Finds all converters in the given list that support taking any of the given types as input.
   * Filters out converters that would produce an already seen type.
   */
  private async supportedConverters(
    types: ValuePreferences,
    metadata: RepresentationMetadata,
    converters: TypedRepresentationConverter[],
  ): Promise<ConverterPreference[]> {
    const typeEntries = Object.entries(types);
    const results: ConverterPreference[] = [];
    for (const converter of converters) {
      for (const [ inType, weight ] of typeEntries) {
        // This metadata object is only used internally so changing the content-type is fine
        metadata.contentType = inType;
        const preference = await this.findConverterPreference(inType, weight, metadata, converter);
        if (preference) {
          results.push(preference);
        }
      }
    }
    return results;
  }

  /**
   * Returns a ConverterPreference if the given converter supports the given type.
   * All types that have already been used will be removed from the output types.
   */
  private async findConverterPreference(
    inType: string,
    weight: number,
    metadata: RepresentationMetadata,
    converter: TypedRepresentationConverter,
  ): Promise<ConverterPreference | undefined> {
    const representation = new BasicRepresentation([], metadata);
    try {
      const identifier = { path: representation.metadata.identifier.value };
      // Internal types get ignored when trying to match everything, so they need to be specified to also match.
      // eslint-disable-next-line ts/naming-convention
      await converter.canHandle({ representation, identifier, preferences: { type: { '*/*': 1, 'internal/*': 1 }}});
    } catch {
      // Skip converters that fail the canHandle test
      return;
    }

    let outTypes = await converter.getOutputTypes(inType);
    outTypes = this.modifyTypeWeights(weight, outTypes);
    return { converter, inType, outTypes };
  }
}
