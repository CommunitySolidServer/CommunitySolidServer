import { posix, win32 } from 'node:path';
import { readJson } from 'fs-extra';
import urljoin from 'url-join';
import type { TargetExtractor } from '../http/input/identifier/TargetExtractor';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { HttpRequest } from '../server/HttpRequest';
import { BadRequestHttpError } from './errors/BadRequestHttpError';
import { errorTermsToMetadata } from './errors/HttpErrorUtil';
import type { Json } from './Json';

/**
 * Changes a potential Windows path into a POSIX path.
 *
 * @param path - Path to check (POSIX or Windows).
 *
 * @returns The potentially changed path (POSIX).
 */
function windowsToPosixPath(path: string): string {
  return path.replaceAll(/\\+/gu, '/');
}

/**
 * Resolves relative segments in the path.
 *
 * @param path - Path to check (POSIX or Windows).
 *
 * @returns The potentially changed path (POSIX).
 */
export function normalizeFilePath(path: string): string {
  return posix.normalize(windowsToPosixPath(path));
}

/**
 * Adds the paths to the base path.
 *
 * @param basePath - The base path (POSIX or Windows).
 * @param paths - Subpaths to attach (POSIX).
 *
 * @returns The potentially changed path (POSIX).
 */
export function joinFilePath(basePath: string, ...paths: string[]): string {
  return posix.join(windowsToPosixPath(basePath), ...paths);
}

/**
 * Resolves a path to its absolute form.
 * Absolute inputs will not be changed (except changing Windows to POSIX).
 * Relative inputs will be interpreted relative to process.cwd().
 *
 * @param path - Path to check (POSIX or Windows).
 *
 * @returns The potentially changed path (POSIX).
 */
export function absoluteFilePath(path: string): string {
  if (posix.isAbsolute(path)) {
    return path;
  }
  if (win32.isAbsolute(path)) {
    return windowsToPosixPath(path);
  }

  return joinFilePath(process.cwd(), path);
}

/**
 * Makes sure the input path has exactly 1 slash at the end.
 * Multiple slashes will get merged into one.
 * If there is no slash it will be added.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export function ensureTrailingSlash(path: string): string {
  return path.replace(/\/*$/u, '/');
}

/**
 * Makes sure the input path has no slashes at the end.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export function trimTrailingSlashes(path: string): string {
  return path.replace(/\/+$/u, '');
}

/**
 * Makes sure the input path has exactly 1 slash at the beginning.
 * Multiple slashes will get merged into one.
 * If there is no slash it will be added.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export function ensureLeadingSlash(path: string): string {
  return path.replace(/^\/*/u, '/');
}

/**
 * Makes sure the input path has no slashes at the beginning.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export function trimLeadingSlashes(path: string): string {
  return path.replace(/^\/+/u, '');
}

/**
 * Extracts the extension (without dot) from a path.
 * Custom function since `path.extname` does not work on all cases (e.g. ".acl")
 *
 * @param path - Input path to parse.
 */
export function getExtension(path: string): string {
  const extension = /\.([^./]+)$/u.exec(path);
  return extension ? extension[1] : '';
}

/**
 * Performs a transformation on the path components of a URI,
 * preserving but normalizing path delimiters and their escaped forms.
 */
function transformPathComponents(path: string, transform: (part: string) => string): string {
  const [ , base, queryString ] = /^([^?]*)(\?.*)?$/u.exec(path)!;
  const transformed = base
    // We split on actual URI path component delimiters (slash and backslash),
    // but also on things that could be wrongly interpreted as component delimiters,
    // such that they cannot be transformed incorrectly.
    // We thus ensure that encoded slashes (%2F) and backslashes (%5C) are preserved,
    // since they would become _actual_ delimiters if accidentally decoded.
    // Additionally, we need to preserve any encoded percent signs (%25)
    // that precede them, because these might change their interpretation as well.
    .split(/(\/|\\|%(?:25)*(?:2f|5c))/iu)
    // Even parts map to components that need to be transformed,
    // odd parts to (possibly escaped) delimiters that need to be normalized.
    .map((part, index): string =>
      index % 2 === 0 ? transform(part) : part.toUpperCase())
    .join('');
  return queryString ? `${transformed}${queryString}` : transformed;
}

/**
 * Converts a URI path to the canonical version by splitting on slashes,
 * decoding any percent-based encodings, and then encoding any special characters.
 * This function is used to clean unwanted characters in the components of
 * the provided path.
 *
 * @param path - The path to convert to its canonical URI path form.
 *
 * @returns The canonical URI path form of the provided path.
 */
export function toCanonicalUriPath(path: string): string {
  return transformPathComponents(path, (part): string =>
    encodeURIComponent(decodeURIComponent(part)));
}

/* eslint-disable ts/naming-convention */
// Characters not allowed in a Windows file path
const forbiddenSymbols = {
  '<': '%3C',
  '>': '%3E',
  ':': '%3A',
  '"': '%22',
  '|': '%7C',
  '?': '%3F',
  // `*` does not get converted by `encodeUriComponent`
  '*': '%2A',
} as const;
/* eslint-enable ts/naming-convention */
const forbiddenRegex = new RegExp(`[${Object.keys(forbiddenSymbols).join('')}]`, 'gu');
/**
 * This function is used when converting a URI to a file path. Decodes all components of a URI path,
 * with the exception of encoded slash characters, as this would lead to unexpected file locations
 * being targeted (resulting in erroneous behaviour of the file based backend).
 * Characters that would result in an illegal file path remain percent encoded.
 *
 * @param path - The path to decode the URI path components of.
 *
 * @returns A decoded copy of the provided URI path (ignoring encoded slash characters).
 */
export function decodeUriPathComponents(path: string): string {
  return transformPathComponents(path, (part): string => decodeURIComponent(part)
    // The characters replaced below result in illegal Windows file paths so need to be encoded
    .replace(forbiddenRegex, (val): string => forbiddenSymbols[val as keyof typeof forbiddenSymbols]));
}

/**
 * This function is used in the process of converting a file path to a URI. Encodes all (non-slash)
 * special characters in a URI path, with the exception of encoded slash characters, as this would
 * lead to unnecessary double encoding, resulting in a URI that differs from the expected result.
 *
 * @param path - The path to encode the URI path components of.
 *
 * @returns An encoded copy of the provided URI path (ignoring encoded slash characters).
 */
export function encodeUriPathComponents(path: string): string {
  return transformPathComponents(path, encodeURIComponent);
}

/**
 * Checks whether the path corresponds to a container path (ending in a /).
 *
 * @param path - Path to check.
 */
export function isContainerPath(path: string): boolean {
  // Solid, §3.1: "Paths ending with a slash denote a container resource."
  // https://solid.github.io/specification/protocol#uri-slash-semantics
  return path.endsWith('/');
}

/**
 * Checks whether the identifier corresponds to a container identifier.
 *
 * @param identifier - Identifier to check.
 */
export function isContainerIdentifier(identifier: ResourceIdentifier): boolean {
  return isContainerPath(identifier.path);
}

/**
 * Splits a URL (or similar) string into a part containing its scheme and one containing the rest.
 * E.g., `http://test.com/` results in `{ scheme: 'http://', rest: 'test.com/' }`.
 *
 * @param url - String to parse.
 */
export function extractScheme(url: string): { scheme: string; rest: string } {
  const match = /^([^:]+:\/\/)(.*)$/u.exec(url)!;
  return { scheme: match[1], rest: match[2] };
}

/**
 * Creates a relative URL by removing the base URL.
 * Will throw an error in case the resulting target is not withing the base URL scope.
 *
 * @param baseUrl - Base URL.
 * @param request - Incoming request of which the target needs to be extracted.
 * @param targetExtractor - Will extract the target from the request.
 */
export async function getRelativeUrl(baseUrl: string, request: HttpRequest, targetExtractor: TargetExtractor):
Promise<string> {
  baseUrl = ensureTrailingSlash(baseUrl);
  const target = await targetExtractor.handleSafe({ request });
  if (!target.path.startsWith(baseUrl)) {
    throw new BadRequestHttpError(
      `The identifier ${target.path} is outside the configured identifier space.`,
      { errorCode: 'E0001', metadata: errorTermsToMetadata({ path: target.path }) },
    );
  }
  return target.path.slice(baseUrl.length - 1);
}

/**
 * Creates a regular expression that matches URLs containing the given baseUrl, or a subdomain of the given baseUrl.
 * In case there is a subdomain, the first match of the regular expression will be that subdomain.
 *
 * Examples with baseUrl `http://test.com/foo/`:
 * - Will match `http://test.com/foo/`
 * - Will match `http://test.com/foo/bar/baz`
 * - Will match `http://alice.bob.test.com/foo/bar/baz`, first match result will be `alice.bob`
 * - Will not match `http://test.com/`
 * - Will not match `http://alicetest.com/foo/`
 *
 * @param baseUrl - Base URL for the regular expression.
 */
export function createSubdomainRegexp(baseUrl: string): RegExp {
  const { scheme, rest } = extractScheme(baseUrl);
  return new RegExp(`^${scheme}(?:([^/]+)\\.)?${rest}`, 'u');
}

/**
 * Returns the folder corresponding to the root of the Community Solid Server module
 */
export function getModuleRoot(): string {
  return joinFilePath(__dirname, '../../');
}

/**
 * A placeholder for the path to the `@solid/community-server` module root.
 * The `resolveAssetPath` function will replace this string with the actual path.
 */
export const modulePathPlaceholder = '@css:';

/**
 * Creates a path starting from the `@solid/community-server` module root,
 * to be resolved by the `resolveAssetPath` function.
 */
export function modulePath(relativePath = ''): string {
  return `${modulePathPlaceholder}${relativePath}`;
}

/**
 * Creates an absolute path starting from the `@solid/community-server` module root.
 */
export function resolveModulePath(relativePath = ''): string {
  return joinFilePath(getModuleRoot(), relativePath);
}

/**
 * Converts file path inputs into absolute paths.
 * Works similar to `absoluteFilePath` but paths that start with the `modulePathPlaceholder`
 * will be relative to the module directory instead of the cwd.
 */
export function resolveAssetPath(path = modulePathPlaceholder): string {
  if (path.startsWith(modulePathPlaceholder)) {
    return resolveModulePath(path.slice(modulePathPlaceholder.length));
  }
  return absoluteFilePath(path);
}

/**
 * Reads the project package.json and returns it.
 */
export async function readPackageJson(): Promise<Record<string, Json>> {
  return readJson(resolveModulePath('package.json')) as Promise<Record<string, Json>>;
}

/**
 * Concatenates all the given strings into a normalized URL.
 * Will place slashes between input strings if necessary.
 */
export const joinUrl = urljoin;
