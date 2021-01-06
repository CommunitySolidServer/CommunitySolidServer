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
 * Determines whether the object is a `ResourceIdentifier`.
 */
export function isResourceIdentifier(object: any): object is ResourceIdentifier {
  return object && (typeof object.path === 'string');
}
