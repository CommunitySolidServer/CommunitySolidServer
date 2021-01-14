import { posix } from 'path';
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
 * Resolves relative segments in the path/
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
 * Converts a URI path to the canonical version by splitting on slashes,
 * decoding any percent-based encodings,
 * and then encoding any special characters.
 */
export function toCanonicalUriPath(path: string): string {
  return path.split('/').map((part): string =>
    encodeURIComponent(decodeURIComponent(part))).join('/');
}

/**
 * Decodes all components of a URI path.
 */
export function decodeUriPathComponents(path: string): string {
  return path.split('/').map(decodeURIComponent).join('/');
}

/**
 * Encodes all (non-slash) special characters in a URI path.
 */
export function encodeUriPathComponents(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

/**
 * Checks if the path corresponds to a container path (ending in a /).
 * @param path - Path to check.
 */
export function isContainerPath(path: string): boolean {
  return path.endsWith('/');
}

/**
 * Checks if the identifier corresponds to a container identifier.
 * @param identifier - Identifier to check.
 */
export function isContainerIdentifier(identifier: ResourceIdentifier): boolean {
  return isContainerPath(identifier.path);
}
