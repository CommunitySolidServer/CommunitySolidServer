import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { InternalServerError } from './errors/InternalServerError';

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
 * Finds the container containing the given resource.
 * This does not ensure either the container or resource actually exist.
 *
 * @param id - Identifier to find container of.
 *
 * @returns The identifier of the container this resource is in.
 */
export const getParentContainer = (id: ResourceIdentifier): ResourceIdentifier => {
  // Trailing slash is necessary for URL library
  const parentPath = new URL('..', ensureTrailingSlash(id.path)).toString();

  // This probably means there is an issue with the root
  if (parentPath === id.path) {
    throw new InternalServerError('URL root reached');
  }

  return { path: parentPath };
};

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
