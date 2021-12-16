/* eslint-disable tsdoc/syntax */
import type { Arguments, Argv, Options } from 'yargs';
import yargs from 'yargs';
import { CliExtractor } from './CliExtractor';

export type YargsArgOptions = Record<string, Options>;

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
  protected readonly yargsArgOptions: YargsArgOptions;
  protected readonly yargvOptions: CliOptions;

  /**
   * @param parameters - Parameters that should be parsed from the CLI. @range {json}
   *                     Format details can be found at https://yargs.js.org/docs/#api-reference-optionskey-opt
   * @param options - Additional options to configure yargs. @range {json}
   */
  public constructor(parameters: YargsArgOptions = {}, options: CliOptions = {}) {
    super();
    this.yargsArgOptions = parameters;
    this.yargvOptions = options;
  }

  public async handle(argv: readonly string[]): Promise<Arguments> {
    let yArgv = this.createYArgv(argv);
    yArgv = this.validateArguments(yArgv);

    return yArgv.parse();
  }

  /**
   * Creates the yargs Argv object based on the input CLI argv.
   */
  private createYArgv(argv: readonly string[]): Argv {
    let yArgv = yargs(argv.slice(2));
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

  /**
   * Makes sure there are no positional arguments or multiple values for the same key.
   */
  private validateArguments(yArgv: Argv): Argv {
    return yArgv.check((args): boolean => {
      if (args._.length > 0) {
        throw new Error(`Unsupported positional arguments: "${args._.join('", "')}"`);
      }
      for (const [ key, val ] of Object.entries(args)) {
        // We have no options that allow for arrays
        if (key !== '_' && Array.isArray(val)) {
          throw new Error(`Multiple values were provided for: "${key}": "${val.join('", "')}"`);
        }
      }
      return true;
    });
  }
}
