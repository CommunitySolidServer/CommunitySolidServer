import type { Representation } from '../../http/representation/Representation';
import type { ValuePreference, ValuePreferences } from '../../http/representation/RepresentationPreferences';
import { getLoggerFor } from '../../logging/LogUtil';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { cleanPreferences, getBestPreference, getTypeWeight, preferencesToString } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { RepresentationConverter } from './RepresentationConverter';
import type { TypedRepresentationConverter } from './TypedRepresentationConverter';

type ConverterPreference = {
  converter: TypedRepresentationConverter;
  inType: string;
  outTypes: ValuePreferences;
};

/**
 * A chain of converters that can go from `inTypes` to `outTypes`.
 * `intermediateTypes` contains the exact types that have the highest weight when going from converter i to i+1.
 */
type ConversionPath = {
  converters: TypedRepresentationConverter[];
  intermediateTypes: string[];
  inType: string;
  outTypes: ValuePreferences;
};

/**
 * The result of choosing a specific output for a `ConversionPath`.
 */
type MatchedPath = {
  path: ConversionPath;
  outType: string;
  weight: number;
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
 *  - Caching: https://github.com/solid/community-server/issues/832
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

    // No conversion needed
    if (!this.isMatchedPath(match)) {
      return input.representation;
    }

    const { path, outType } = match;
    this.logger.debug(`Converting ${path.inType} -> ${[ ...path.intermediateTypes, outType ].join(' -> ')}.`);

    const args = { ...input };
    for (let i = 0; i < path.converters.length - 1; ++i) {
      const type = path.intermediateTypes[i];
      args.preferences = { type: { [type]: 1 }};
      args.representation = await path.converters[i].handle(args);
    }
    // For the last converter we set the preferences to the best output type
    args.preferences = { type: { [outType]: 1 }};
    return path.converters.slice(-1)[0].handle(args);
  }

  private isMatchedPath(path: unknown): path is MatchedPath {
    return typeof (path as MatchedPath).path === 'object';
  }

  /**
   * Finds a conversion path that can handle the given input.
   */
  private async findPath(input: RepresentationConverterArgs): Promise<MatchedPath | ValuePreference> {
    const type = input.representation.metadata.contentType!;
    const preferences = cleanPreferences(input.preferences.type);

    const weight = getTypeWeight(type, preferences);
    if (weight > 0) {
      this.logger.debug(`No conversion required: ${type} already matches ${preferencesToString(preferences)}`);
      return { value: type, weight };
    }

    return this.generatePath(type, preferences);
  }

  /**
   * Tries to generate the optimal `ConversionPath` that supports the given parameters,
   * which will then be used to instantiate a specific `MatchedPath` for those parameters.
   *
   * Errors if such a path does not exist.
   */
  private async generatePath(inType: string, outPreferences: ValuePreferences): Promise<MatchedPath> {
    // Generate paths from all converters that match the input type
    let paths = await this.converters.reduce(async(matches: Promise<ConversionPath[]>, converter):
    Promise<ConversionPath[]> => {
      const outTypes = await converter.getOutputTypes(inType);
      if (Object.keys(outTypes).length > 0) {
        (await matches).push({
          converters: [ converter ],
          intermediateTypes: [],
          inType,
          outTypes,
        });
      }
      return matches;
    }, Promise.resolve([]));

    // It's impossible for a path to have a higher weight than this value
    const maxWeight = Math.max(...Object.values(outPreferences));

    let bestPath = this.findBest(outPreferences, paths);
    paths = this.removeBadPaths(paths, maxWeight, bestPath);
    // This will always stop at some point since paths can't have the same converter twice
    while (paths.length > 0) {
      // For every path, find all the paths that can be made by adding 1 more converter
      const promises = paths.map(async(path): Promise<ConversionPath[]> => this.takeStep(path));
      paths = (await Promise.all(promises)).flat();
      const newBest = this.findBest(outPreferences, paths);
      if (newBest && (!bestPath || newBest.weight > bestPath.weight)) {
        bestPath = newBest;
      }
      paths = this.removeBadPaths(paths, maxWeight, bestPath);
    }

    if (!bestPath) {
      this.logger.warn(`No conversion path could be made from ${inType} to ${Object.keys(outPreferences)}.`);
      throw new NotImplementedHttpError(
        `No conversion path could be made from ${inType} to ${Object.keys(outPreferences)}.`,
      );
    }
    return bestPath;
  }

  /**
   * Finds the path from the given list that can convert to the given preferences.
   * If there are multiple matches the one with the highest result weight gets chosen.
   * Will return undefined if there are no matches.
   */
  private findBest(preferences: ValuePreferences, paths: ConversionPath[]): MatchedPath | undefined {
    // Need to use null instead of undefined so `reduce` doesn't take the first element of the array as `best`
    return paths.reduce((best: MatchedPath | null, path): MatchedPath | null => {
      const outMatch = getBestPreference(path.outTypes, preferences);
      if (outMatch && !(best && best.weight >= outMatch.weight)) {
        // Create new MatchedPath, using the output match above
        return { path, outType: outMatch.value, weight: outMatch.weight };
      }
      return best;
    }, null) ?? undefined;
  }

  /**
   * Filter out paths that can no longer be better than the current best solution.
   * This depends on a valid path already being found, if not all the input paths will be returned.
   *
   * @param paths - Paths to filter.
   * @param maxWeight - The maximum weight in the output preferences.
   * @param bestMatch - The current best path.
   */
  private removeBadPaths(paths: ConversionPath[], maxWeight: number, bestMatch?: MatchedPath): ConversionPath[] {
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
  private async takeStep(path: ConversionPath): Promise<ConversionPath[]> {
    const unusedConverters = this.converters.filter((converter): boolean => !path.converters.includes(converter));
    const nextConverters = await this.supportedConverters(path.outTypes, unusedConverters);

    // Create a new path for every converter that can be appended
    return Promise.all(nextConverters.map(async(pref): Promise<ConversionPath> => ({
      converters: [ ...path.converters, pref.converter ],
      intermediateTypes: [ ...path.intermediateTypes, pref.inType ],
      inType: path.inType,
      outTypes: pref.outTypes,
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
   */
  private async supportedConverters(types: ValuePreferences, converters: TypedRepresentationConverter[]):
  Promise<ConverterPreference[]> {
    const typeEntries = Object.entries(types);
    const results: ConverterPreference[] = [];
    for (const converter of converters) {
      for (const [ inType, weight ] of typeEntries) {
        let outTypes = await converter.getOutputTypes(inType);
        outTypes = this.modifyTypeWeights(weight, outTypes);
        results.push({ converter, inType, outTypes });
      }
    }
    return results;
  }
}
