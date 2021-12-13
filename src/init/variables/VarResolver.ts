/* eslint-disable tsdoc/syntax */
import type { Arguments, Argv, InferredOptionTypes, Options } from 'yargs';
import yargs from 'yargs';
import { LOG_LEVELS } from '../../logging/LogLevel';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import { modulePathPlaceholder } from '../../util/PathUtil';
import type { VarComputer } from './VarComputer';

const defaultConfig = `${modulePathPlaceholder}config/default.json`;
/**
 * CLI options needed for performing meta-process of app initialization.
 * These options doesn't contribute to components-js vars normally.
 */
const baseArgs = {
  config: { type: 'string', alias: 'c', default: defaultConfig, requiresArg: true },
  loggingLevel: { type: 'string', alias: 'l', default: 'info', requiresArg: true, choices: LOG_LEVELS },
  mainModulePath: { type: 'string', alias: 'm', requiresArg: true },
} as const;

export function setupBaseArgs(yArgv: Argv): Argv<InferredOptionTypes<typeof baseArgs>> {
  return yArgv.options(baseArgs);
}

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

export type VariableValues = Record<string, unknown>;

/**
 * This class translates command-line arguments/env-vars into values for specific variables,
 * which can then be used to instantiate a parametrized Components.js configuration.
 */
export class VarResolver extends AsyncHandler<string[], VariableValues> {
  protected readonly yargsArgOptions: YargsArgOptions;
  protected readonly yargvOptions: CliOptions;
  protected readonly varComputers: Record<string, VarComputer>;

  /**
     * @param parameters - record of option to it's yargs opt config. @range {json}
     * @param options - options to configure yargv. @range {json}
     * @param varComputers - record of componentsjs var-iri to VarComputer.
     */
  public constructor(parameters: YargsArgOptions, options: CliOptions, varComputers: Record<string, VarComputer>) {
    super();
    this.yargsArgOptions = parameters;
    this.yargvOptions = options;
    this.varComputers = varComputers;
  }

  private async parseArgs(argv: readonly string[]): Promise<Arguments> {
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
    return setupBaseArgs(yArgv.options(this.yargsArgOptions));
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

  private async resolveVariables(args: Record<string, unknown>): Promise<Record<string, any>> {
    const vars: Record<string, any> = {};
    for (const [ name, computer ] of Object.entries(this.varComputers)) {
      try {
        vars[name] = await computer.handle(args);
      } catch (err: unknown) {
        throw new Error(`Error in computing value for variable ${name}: ${createErrorMessage(err)}`);
      }
    }
    return vars;
  }

  public async handle(argv: readonly string[]): Promise<VariableValues> {
    const args = await this.parseArgs(argv);
    return this.resolveVariables(args);
  }
}
