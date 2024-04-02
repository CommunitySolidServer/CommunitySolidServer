/**
 * Used for instantiating new object using Components.js configurations.
 */
export interface ComponentsJsFactory {
  /**
   * Instantiates a new object using Components.js.
   *
   * @param configPath - Location of the config to instantiate.
   * @param componentIri - IRI of the object in the config that will be the result.
   * @param variables - Variables to send to Components.js
   *
   * @returns The resulting object, corresponding to the given component IRI.
   */
  generate: <T>(configPath: string, componentIri: string, variables: Record<string, unknown>) => Promise<T>;
}
