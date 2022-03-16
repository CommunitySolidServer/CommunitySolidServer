/**
 * The parameters supported for the given route.
 */
export type RouteParameter<TRoute extends InteractionRoute<string>> =
  TRoute extends InteractionRoute<infer TParam> ? TParam : never;

/**
 * A route that adds a parameter to an existing route type.
 */
export type ExtendedRoute<TRoute extends InteractionRoute<string>, TParam extends string> =
  InteractionRoute<RouteParameter<TRoute> | TParam>;

/**
 * Routes are used to handle the pathing for API calls.
 *
 * They can have dynamic values in the paths they support.
 * Typings are used to indicate the keys used to indicate what the corresponding values are.
 */
export interface InteractionRoute<T extends string = never> {
  /**
   * Returns the path that is the result of having the specified values for the dynamic parameters.
   *
   * Will throw an error in case the input `parameters` object is missing one of the expected keys.
   *
   * @param parameters - Values for the dynamic parameters.
   */
  getPath: (parameters?: Record<T, string>) => string;

  /**
   * Checks if the provided path matches the route (pattern).
   *
   * The result will be `undefined` if there is no match.
   *
   * If there is a match the result object will have the corresponding values for all the parameters.
   *
   * @param path - The path to verify.
   */
  matchPath: (path: string) => Record<T, string> | undefined;
}
