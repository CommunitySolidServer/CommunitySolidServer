import platform, { posix } from 'path';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';

/**
 * Changes a potential Windows path into a POSIX path.
 *
 * @param path - Path to check (POSIX or Windows).
 *
 * @returns The potentially changed path (POSIX).
 */
const windowsToPosixPath = (path: string): string => path.replace(/\\+/gu, '/');

/**
 * Resolves relative segments in the path/
 *
 * @param path - Path to check (POSIX or Windows).
 *
 * @returns The potentially changed path (POSIX).
 */
export const normalizeFilePath = (path: string): string =>
  posix.normalize(windowsToPosixPath(path));

/**
 * Adds the paths to the base path.
 *
 * @param basePath - The base path (POSIX or Windows).
 * @param paths - Subpaths to attach (POSIX).
 *
 * @returns The potentially changed path (POSIX).
 */
export const joinFilePath = (basePath: string, ...paths: string[]): string =>
  posix.join(windowsToPosixPath(basePath), ...paths);

/**
 * Converts the path into an OS-dependent path.
 *
 * @param path - Path to check (POSIX).
 *
 * @returns The potentially changed path (OS-dependent).
 */
export const toSystemFilePath = (path: string): string =>
  platform.normalize(path);

/**
 * Makes sure the input path has exactly 1 slash at the end.
 * Multiple slashes will get merged into one.
 * If there is no slash it will be added.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export const ensureTrailingSlash = (path: string): string => path.replace(/\/*$/u, '/');

/**
 * Makes sure the input path has no slashes at the end.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export const trimTrailingSlashes = (path: string): string => path.replace(/\/+$/u, '');

/**
 * Converts a URI path to the canonical version by splitting on slashes,
 * decoding any percent-based encodings,
 * and then encoding any special characters.
 */
export const toCanonicalUriPath = (path: string): string => path.split('/').map((part): string =>
  encodeURIComponent(decodeURIComponent(part))).join('/');

/**
 * Decodes all components of a URI path.
 */
export const decodeUriPathComponents = (path: string): string => path.split('/').map(decodeURIComponent).join('/');

/**
 * Encodes all (non-slash) special characters in a URI path.
 */
export const encodeUriPathComponents = (path: string): string => path.split('/').map(encodeURIComponent).join('/');

/**
 * Checks if the path corresponds to a container path (ending in a /).
 * @param path - Path to check.
 */
export const isContainerPath = (path: string): boolean => path.endsWith('/');

/**
 * Checks if the identifier corresponds to a container identifier.
 * @param identifier - Identifier to check.
 */
export const isContainerIdentifier = (identifier: ResourceIdentifier): boolean => isContainerPath(identifier.path);
