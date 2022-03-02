/**
 * An object with a specific path.
 */
export interface InteractionRoute {
  /**
   * @returns The absolute path of this route.
   */
  getPath: () => string;
}
