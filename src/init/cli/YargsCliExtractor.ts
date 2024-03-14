import type { Arguments, Argv, Options } from 'yargs';
import yargs from 'yargs';
import { CliExtractor } from './CliExtractor';

// This type exists to prevent Components.js from erroring on an unknown type
export type YargsOptions = Options;

/**
 * This class exists as wrapper around a yargs Options object,
 * thereby allowing us to create these in a Components.js configuration.
 *
 * Format details can be found at https://yargs.js.org/docs/#api-reference-optionskey-opt
 */
export class YargsParameter {
  public readonly name: string;
  public readonly options: YargsOptions;

  /**
   * @param name - Name of the parameter. Corresponds to the first parameter passed to the `yargs.options` function.
   * @param options - Options for a single parameter that should be parsed. @range {json}
   */
  public constructor(name: string, options: Record<string, unknown>) {
    this.name = name;
    this.options = options;
  }
}

export interface CliOptions {
  // Usage string printed in case of CLI errors
  usage?: string;
  // Errors on unknown CLI parameters when enabled.
  // @see https://yargs.js.org/docs/#api-reference-strictenabledtrue
  strictMode?: boolean;
  // Loads CLI args from environment variables when enabled.
  // @see http://yargs.js.org/docs/#api-reference-envprefix
  loadFromEnv?: boolean;
  // Prefix to be used when `loadFromEnv` is enabled.
  // @see http://yargs.js.org/docs/#api-reference-envprefix
  envVarPrefix?: string;
}

/**
 * Parses CLI args using the yargs library.
 * Specific settings can be enabled through the provided options.
 */
export class YargsCliExtractor extends CliExtractor {
  protected readonly yargsArgOptions: Record<string, YargsOptions>;
  protected readonly yargvOptions: CliOptions;

  /**
   * @param parameters - Parameters that should be parsed from the CLI.
   * @param options - Additional options to configure yargs. @range {json}
   *
   * JSON parameters cannot be optional due to https://github.com/LinkedSoftwareDependencies/Components-Generator.js/issues/87
   */
  public constructor(parameters: YargsParameter[], options: CliOptions) {
    super();
    this.yargsArgOptions = Object.fromEntries(
      parameters.map((entry): [string, YargsOptions] => [ entry.name, entry.options ]),
    );
    this.yargvOptions = { ...options };
  }

  public async handle(argv: readonly string[]): Promise<Arguments> {
    return this.createYArgv(argv).parse();
  }

  /**
   * Creates the yargs Argv object based on the input CLI argv.
   */
  private createYArgv(argv: readonly string[]): Argv {
    let yArgv = yargs(argv.slice(2));

    // Error and show help message when multiple values were provided
    // for a non Array type parameter
    yArgv.check((args): boolean => {
      for (const [ name, options ] of Object.entries(this.yargsArgOptions)) {
        if (options.type !== 'array' && Array.isArray(args[name])) {
          throw new Error(
            `Multiple values for --${name} (-${options.alias as string}) were provided where only one is allowed`,
          );
        }
      }
      return true;
    });

    if (this.yargvOptions.usage !== undefined) {
      yArgv = yArgv.usage(this.yargvOptions.usage);
    }
    if (this.yargvOptions.strictMode) {
      yArgv = yArgv.strict();
    }
    if (this.yargvOptions.loadFromEnv) {
      yArgv = yArgv.env(this.yargvOptions.envVarPrefix ?? '');
    }
    return yArgv.options(this.yargsArgOptions);
  }
}
