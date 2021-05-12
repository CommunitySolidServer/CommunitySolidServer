import type { Representation } from '../../ldp/representation/Representation';
import type { ValuePreference, ValuePreferences } from '../../ldp/representation/RepresentationPreferences';
import { getLoggerFor } from '../../logging/LogUtil';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { cleanPreferences, getBestPreference, getTypeWeight } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { RepresentationConverter } from './RepresentationConverter';
import type { TypedRepresentationConverter } from './TypedRepresentationConverter';

type ConverterPreference = ValuePreference & { converter: TypedRepresentationConverter };

/**
 * A chain of converters that can go from `inTypes` to `outTypes`.
 * `intermediateTypes` contains the exact types that have the highest weight when going from converter i to i+1.
 */
type ConversionPath = {
  converters: TypedRepresentationConverter[];
  intermediateTypes: string[];
  inTypes: ValuePreferences;
  outTypes: ValuePreferences;
};

/**
 * The result of applying a `ConversionPath` to a specific input.
 */
type MatchedPath = {
  path: ConversionPath;
  inType: string;
  outType: string;
  weight: number;
};

/**
 * An LRU cache for storing `ConversionPath`s.
 */
class LruPathCache {
  private readonly maxSize: number;
  // Contents are ordered from least to most recently used
  private readonly paths: ConversionPath[] = [];

  public constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * Add the given path to the cache as most recently used.
   */
  public add(path: ConversionPath): void {
    this.paths.push(path);
    if (this.paths.length > this.maxSize) {
      this.paths.shift();
    }
  }

  /**
   * Find a path that can convert the given type to the given preferences.
   * Note that this finds the first matching path in the cache,
   * not the best one, should there be multiple results.
   * In practice this should almost never be the case though.
   */
  public find(inType: string, outPreferences: ValuePreferences): MatchedPath | undefined {
    // Last element is most recently used so has more chance of being the correct one
    for (let i = this.paths.length - 1; i >= 0; --i) {
      const path = this.paths[i];
      // Check if `inType` matches the input and `outPreferences` the output types of the path
      const match = this.getMatchedPath(inType, outPreferences, path);
      if (match) {
        // Set matched path to most recent result in the cache
        this.paths.splice(i, 1);
        this.paths.push(path);
        return match;
      }
    }
  }

  /**
   * Calculates the weights and exact types when using the given path on the given type and preferences.
   * Undefined if there is no match
   */
  private getMatchedPath(inType: string, outPreferences: ValuePreferences, path: ConversionPath):
  MatchedPath | undefined {
    const inWeight = getTypeWeight(inType, path.inTypes);
    if (inWeight === 0) {
      return;
    }
    const outMatch = getBestPreference(path.outTypes, outPreferences);
    if (!outMatch) {
      return;
    }
    return { path, inType, outType: outMatch.value, weight: inWeight * outMatch.weight };
  }
}

/**
 * A meta converter that takes an array of other converters as input.
 * It chains these converters by finding a path of converters
 * that can go from the given content-type to the given type preferences.
 * In case there are multiple paths, the shortest one with the highest weight gets found.
 * Will error in case no path can be found.
 *
 * Generated paths get stored in an internal cache for later re-use on similar requests.
 * Note that due to this caching `RepresentationConverter`s
 * that change supported input/output types at runtime are not supported,
 * unless cache size is set to 0.
 *
 * This is not a TypedRepresentationConverter since the supported output types
 * might depend on what is the input content-type.
 *
 * Some suggestions on how this class can be even more optimized should this ever be needed in the future.
 * Most of these decrease computation time at the cost of more memory.
 *  - Subpaths that are generated could also be cached.
 *  - When looking for the next step, cached paths could also be considered.
 *  - The algorithm could start on both ends of a possible path and work towards the middle.
 *  - When creating a path, store the list of unused converters instead of checking every step.
 */
export class ChainedConverter extends RepresentationConverter {
  protected readonly logger = getLoggerFor(this);

  private readonly converters: TypedRepresentationConverter[];
  private readonly cache: LruPathCache;

  public constructor(converters: TypedRepresentationConverter[], maxCacheSize = 50) {
    super();
    if (converters.length === 0) {
      throw new Error('At least 1 converter is required.');
    }
    this.converters = [ ...converters ];
    this.cache = new LruPathCache(maxCacheSize);
  }

  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    // Will cache the path if found, and error if not
    await this.findPath(input);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    const match = await this.findPath(input);

    // No conversion needed
    if (!this.isMatchedPath(match)) {
      return input.representation;
    }

    const { path } = match;
    this.logger.debug(`Converting ${match.inType} -> ${path.intermediateTypes.join(' -> ')} -> ${match.outType}.`);

    const args = { ...input };
    for (let i = 0; i < path.converters.length - 1; ++i) {
      const type = path.intermediateTypes[i];
      args.preferences = { type: { [type]: 1 }};
      args.representation = await path.converters[i].handle(args);
    }
    // For the last converter we set the preferences to the best output type
    args.preferences = { type: { [match.outType]: 1 }};
    return path.converters.slice(-1)[0].handle(args);
  }

  public async handleSafe(input: RepresentationConverterArgs): Promise<Representation> {
    // This way we don't run `findPath` twice, even though it would be cached for the second call
    return this.handle(input);
  }

  private isMatchedPath(path: unknown): path is MatchedPath {
    return typeof (path as MatchedPath).path === 'object';
  }

  /**
   * Finds a conversion path that can handle the given input,
   * either in the cache or by generating a new one.
   */
  private async findPath(input: RepresentationConverterArgs): Promise<MatchedPath | ValuePreference> {
    const type = input.representation.metadata.contentType;
    if (!type) {
      throw new BadRequestHttpError('Missing Content-Type header.');
    }
    const preferences = cleanPreferences(input.preferences.type);

    const weight = getTypeWeight(type, preferences);
    if (weight > 0) {
      this.logger.debug(`No conversion required: ${type} already matches ${Object.keys(preferences)}`);
      return { value: type, weight };
    }

    // Use a cached solution if we have one.
    // Note that it's possible that a better one could be generated.
    // But this is usually highly unlikely.
    let match = this.cache.find(type, preferences);
    if (!match) {
      match = await this.generatePath(type, preferences);
      this.cache.add(match.path);
    }
    return match;
  }

  /**
   * Tries to generate the optimal and shortest `ConversionPath` that supports the given parameters,
   * which will then be used to instantiate a specific `MatchedPath` for those parameters.
   *
   * Errors if such a path does not exist.
   */
  private async generatePath(inType: string, outPreferences: ValuePreferences): Promise<MatchedPath> {
    // Generate paths from all converters that match the input type
    let paths = await this.converters.reduce(async(matches: Promise<ConversionPath[]>, converter):
    Promise<ConversionPath[]> => {
      const inTypes = await converter.getInputTypes();
      if (getTypeWeight(inType, inTypes) > 0) {
        (await matches).push({
          converters: [ converter ],
          intermediateTypes: [],
          inTypes,
          outTypes: await converter.getOutputTypes(),
        });
      }
      return matches;
    }, Promise.resolve([]));

    let bestPath = this.findBest(inType, outPreferences, paths);
    // This will always stop at some point since paths can't have the same converter twice
    while (!bestPath && paths.length > 0) {
      // For every path, find all the paths that can be made by adding 1 more converter
      const promises = paths.map(async(path): Promise<ConversionPath[]> => this.takeStep(path));
      paths = (await Promise.all(promises)).flat();
      bestPath = this.findBest(inType, outPreferences, paths);
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
   * Finds the path from the given list that can convert the given type to the given preferences.
   * If there are multiple matches the one with the highest result weight gets chosen.
   * Will return undefined if there are no matches.
   */
  private findBest(type: string, preferences: ValuePreferences, paths: ConversionPath[]): MatchedPath | undefined {
    // Need to use null instead of undefined so `reduce` doesn't take the first element of the array as `best`
    return paths.reduce((best: MatchedPath | null, path): MatchedPath | null => {
      const outMatch = getBestPreference(path.outTypes, preferences);
      if (outMatch && !(best && best.weight >= outMatch.weight)) {
        // Create new MatchedPath, using the output match above
        const inWeight = getTypeWeight(type, path.inTypes);
        return { path, inType: type, outType: outMatch.value, weight: inWeight * outMatch.weight };
      }
      return best;
    }, null) ?? undefined;
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
      intermediateTypes: [ ...path.intermediateTypes, pref.value ],
      inTypes: path.inTypes,
      outTypes: this.modifyTypeWeights(pref.weight, await pref.converter.getOutputTypes()),
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
    const promises = converters.map(async(converter): Promise<ConverterPreference | undefined> => {
      const inputTypes = await converter.getInputTypes();
      const match = getBestPreference(types, inputTypes);
      if (match) {
        return { ...match, converter };
      }
    });
    return (await Promise.all(promises)).filter(Boolean) as ConverterPreference[];
  }
}
