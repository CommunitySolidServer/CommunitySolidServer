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
export function isResourceIdentifier(object: any): object is ResourceIdentifier {
  return object && (typeof object.path === 'string');
}

/**
 * Factory function creating a {@link ResourceIdentifier} for convenience.
 */
export function createResourceIdentifier(resourcePath: string): ResourceIdentifier {
  return { path: resourcePath };
}
