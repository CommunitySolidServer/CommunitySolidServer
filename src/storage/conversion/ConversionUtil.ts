import fetch from 'cross-fetch';
import { readJsonSync } from 'fs-extra';
import type { IJsonLdContext } from 'jsonld-context-parser';
import { FetchDocumentLoader } from 'jsonld-context-parser';
import type { ValuePreference, ValuePreferences } from '../../http/representation/RepresentationPreferences';
import { INTERNAL_ALL } from '../../util/ContentTypes';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { resolveAssetPath } from '../../util/PathUtil';

/**
 * First, checks whether a context is stored locally before letting the super class do a fetch.
 * This can be used when converting JSON-LD with Comunica-related libraries, such as `rdf-parse`.
 *
 * To use this, add this document loader to the options of the call
 * using the `KeysRdfParseJsonLd.documentLoader.name` key.
 * All extra keys get passed in the Comunica ActionContext
 * and this is the key that is used to define the document loader.
 * See https://github.com/rubensworks/rdf-parse.js/blob/master/lib/RdfParser.ts
 * and https://github.com/comunica/comunica/blob/master/packages/actor-rdf-parse-jsonld/lib/ActorRdfParseJsonLd.ts
 */
export class ContextDocumentLoader extends FetchDocumentLoader {
  private readonly contexts: Record<string, IJsonLdContext>;

  public constructor(contexts: Record<string, string>) {
    super(fetch);
    this.contexts = {};
    for (const [ key, path ] of Object.entries(contexts)) {
      this.contexts[key] = readJsonSync(resolveAssetPath(path)) as IJsonLdContext;
    }
  }

  public async load(url: string): Promise<IJsonLdContext> {
    if (url in this.contexts) {
      return this.contexts[url];
    }
    return super.load(url);
  }
}

/**
 * Cleans incoming preferences to prevent unwanted behaviour.
 * Makes sure internal types have weight 0, unless specifically requested in the preferences,
 * and interprets empty preferences as accepting everything.
 *
 * @param preferences - Preferences that need to be updated.
 *
 * @returns A copy of the the preferences with the necessary updates.
 */
export function cleanPreferences(preferences: ValuePreferences = {}): ValuePreferences {
  // No preference means anything is acceptable
  const preferred = { ...preferences };
  if (Object.keys(preferences).length === 0) {
    preferred['*/*'] = 1;
  }
  // Prevent accidental use of internal types
  if (!(INTERNAL_ALL in preferred)) {
    preferred[INTERNAL_ALL] = 0;
  }
  return preferred;
}

/**
 * Tries to match the given type to the given preferences.
 * In case there are multiple matches the most specific one will be chosen as per RFC 7231.
 *
 * @param type - Type for which the matching weight is needed.
 * @param preferred - Preferences to match the type to.
 *
 * @returns The corresponding weight from the preferences or 0 if there is no match.
 */
export function getTypeWeight(type: string, preferred: ValuePreferences): number {
  const match = /^([^/]+)\/([^\s;]+)/u.exec(type);
  if (!match) {
    throw new InternalServerError(`Unexpected media type: ${type}.`);
  }
  const [ , main, sub ] = match;
  // RFC 7231
  //    Media ranges can be overridden by more specific media ranges or
  //    specific media types.  If more than one media range applies to a
  //    given type, the most specific reference has precedence.
  return preferred[type] ??
    preferred[`${main}/${sub}`] ??
    preferred[`${main}/*`] ??
    preferred['*/*'] ??
    0;
}

/**
 * Measures the weights for all the given types when matched against the given preferences.
 * Results will be sorted by weight.
 * Weights of 0 indicate that no match is possible.
 *
 * @param types - Types for which we want to calculate the weights.
 * @param preferred - Preferences to match the types against.
 *
 * @returns An array with a {@link ValuePreference} object for every input type, sorted by calculated weight.
 */
export function getWeightedPreferences(types: ValuePreferences, preferred: ValuePreferences): ValuePreference[] {
  const weightedSupported = Object.entries(types)
    .map(([ value, quality ]): ValuePreference => ({ value, weight: quality * getTypeWeight(value, preferred) }));
  return weightedSupported
    .sort(({ weight: weightA }, { weight: weightB }): number => weightB - weightA);
}

/**
 * Finds the type from the given types that has the best match with the given preferences,
 * based on the calculated weight.
 *
 * @param types - Types for which we want to find the best match.
 * @param preferred - Preferences to match the types against.
 *
 * @returns A {@link ValuePreference} containing the best match and the corresponding weight.
 * Undefined if there is no match.
 */
export function getBestPreference(types: ValuePreferences, preferred: ValuePreferences): ValuePreference | undefined {
  // Could also return the first entry of `getWeightedPreferences` but this is more efficient
  let best: ValuePreference = { value: '', weight: 0 };
  for (const [ value, quality ] of Object.entries(types)) {
    if (best.weight >= quality) {
      continue;
    }
    const weight = quality * getTypeWeight(value, preferred);
    if (weight > best.weight) {
      best = { value, weight };
    }
  }

  if (best.weight > 0) {
    return best;
  }
}

/**
 * For a media type converter that can generate the given types,
 * this function tries to find the type that best matches the given preferences.
 *
 * This function combines several other conversion utility functions
 * to determine what output a converter should generate:
 * it cleans the preferences with {@link cleanPreferences} to support empty preferences
 * and to prevent the accidental generation of internal types,
 * after which the best match gets found based on the weights.
 *
 * @param types - Media types that can be converted to.
 * @param preferred - Preferences for output type.
 *
 * @returns The best match. Undefined if there is no match.
 */
export function getConversionTarget(types: ValuePreferences, preferred: ValuePreferences = {}): string | undefined {
  const cleaned = cleanPreferences(preferred);

  return getBestPreference(types, cleaned)?.value;
}

/**
 * Checks if the given type matches the given preferences.
 *
 * @param type - Type to match.
 * @param preferred - Preferences to match against.
 */
export function matchesMediaPreferences(type: string, preferred?: ValuePreferences): boolean {
  return getTypeWeight(type, cleanPreferences(preferred)) > 0;
}

/**
 * Checks whether the given two media types/ranges match each other.
 * Takes wildcards into account.
 *
 * @param mediaA - Media type to match.
 * @param mediaB - Media type to match.
 *
 * @returns True if the media type patterns can match each other.
 */
export function matchesMediaType(mediaA: string, mediaB: string): boolean {
  if (mediaA === mediaB) {
    return true;
  }

  const [ typeA, subTypeA ] = mediaA.split('/');
  const [ typeB, subTypeB ] = mediaB.split('/');
  if (typeA === '*' || typeB === '*') {
    return true;
  }
  if (typeA !== typeB) {
    return false;
  }
  if (subTypeA === '*' || subTypeB === '*') {
    return true;
  }
  return subTypeA === subTypeB;
}

/**
 * Checks if the given content type is an internal content type such as internal/quads.
 * Response will be `false` if the input type is undefined.
 *
 * Do not use this for media ranges.
 *
 * @param contentType - Type to check.
 */
export function isInternalContentType(contentType?: string): boolean {
  return typeof contentType !== 'undefined' && matchesMediaType(contentType, INTERNAL_ALL);
}

/**
 * Serializes a preferences object to a string for display purposes.
 *
 * @param preferences - Preferences to serialize
 */
export function preferencesToString(preferences: ValuePreferences): string {
  return Object.entries(preferences)
    .map(([ type, weight ]): string => `${type}:${weight}`)
    .join(',');
}
