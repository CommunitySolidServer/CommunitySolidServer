/* eslint-disable tsdoc/syntax */
import type { Arguments, Argv, Options } from 'yargs';
import yargs from 'yargs';
import { CliExtractor } from './CliExtractor';

export type YargsArgOptions = Record<string, Options>;

export interface CliOptions {
  // Usage string to be given at cli
  usage?: string;
  // StrictMode determines wether to allow undefined cli-args or not.
  strictMode?: boolean;
  // Wether to load arguments from env-vars or not.
  // @see http://yargs.js.org/docs/#api-reference-envprefix
  loadFromEnv?: boolean;
  // Prefix for env-vars.
  // see yargv docs for behavior. http://yargs.js.org/docs/#api-reference-envprefix
  envVarPrefix?: string;
}

export class YargsCliExtractor extends CliExtractor {
  protected readonly yargsArgOptions: YargsArgOptions;
  protected readonly yargvOptions: CliOptions;

  /**
   * @param parameters - record of option to it's yargs opt config. @range {json}
   * @param options - options to configure yargv. @range {json}
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
