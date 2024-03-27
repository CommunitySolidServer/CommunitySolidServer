/**
 * The unique identifier of a resource.
 */
export interface ResourceIdentifier {
  /**
   * Path to the relevant resource.
   */
  path: string;
}

/**
 * Determines whether the object is a {@link ResourceIdentifier}.
 */
export function isResourceIdentifier(object: unknown): object is ResourceIdentifier {
  return Boolean(object) && typeof (object as ResourceIdentifier).path === 'string';
}
