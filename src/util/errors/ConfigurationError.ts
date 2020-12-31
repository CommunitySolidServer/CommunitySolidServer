/**
 * An error thrown when something is flawed about the configuration.
 */
export class ConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
  }
}
