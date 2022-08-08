// These types are used to clarify what is expected for the CLI-related handlers

/**
 * A list of command line arguments provided to the process.
 */
export type CliArgv = string[];

/**
 * A key/value mapping of parsed command line arguments.
 */
export type Shorthand = Record<string, unknown>;

/**
 * A key/value mapping of Components.js variables.
 */
export type VariableBindings = Record<string, unknown>;
