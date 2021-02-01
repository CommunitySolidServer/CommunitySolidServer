import { posix, win32 } from 'path';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';

/**
 * Changes a potential Windows path into a POSIX path.
 *
 * @param path - Path to check (POSIX or Windows).
 *
 * @returns The potentially changed path (POSIX).
 */
function windowsToPosixPath(path: string): string {
  return path.replace(/\\+/gu, '/');
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
 * Extracts the extension (without dot) from a path.
 * Custom function since `path.extname` does not work on all cases (e.g. ".acl")
 * @param path - Input path to parse.
 */
export function getExtension(path: string): string {
  const extension = /\.([^./]+)$/u.exec(path);
  return extension ? extension[1] : '';
}

/**
 * Performs a transformation on the path components of a URI.
 */
function transformPathComponents(path: string, transform: (part: string) => string): string {
  const [ , base, queryString ] = /^([^?]*)(.*)$/u.exec(path)!;
  const transformed = base.split('/').map(transform).join('/');
  return !queryString ? transformed : `${transformed}${queryString}`;
}

/**
 * Converts a URI path to the canonical version by splitting on slashes,
 * decoding any percent-based encodings, and then encoding any special characters.
 */
export function toCanonicalUriPath(path: string): string {
  return transformPathComponents(path, (part): string =>
    encodeURIComponent(decodeURIComponent(part)));
}

/**
 * Decodes all components of a URI path.
 */
export function decodeUriPathComponents(path: string): string {
  return transformPathComponents(path, decodeURIComponent);
}

/**
 * Encodes all (non-slash) special characters in a URI path.
 */
export function encodeUriPathComponents(path: string): string {
  return transformPathComponents(path, encodeURIComponent);
}

/**
 * Checks if the path corresponds to a container path (ending in a /).
 * @param path - Path to check.
 */
export function isContainerPath(path: string): boolean {
  // Solid, §3.1: "Paths ending with a slash denote a container resource."
  // https://solid.github.io/specification/protocol#uri-slash-semantics
  return path.endsWith('/');
}

/**
 * Checks if the identifier corresponds to a container identifier.
 * @param identifier - Identifier to check.
 */
export function isContainerIdentifier(identifier: ResourceIdentifier): boolean {
  return isContainerPath(identifier.path);
}
