/* eslint-disable tsdoc/syntax */
import yargs from 'yargs';
import { createErrorMessage } from '../..';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import { modulePathPlaceholder } from '../../util/PathUtil';
import type { VarComputer } from './VarComputer';

const defaultConfig = `${modulePathPlaceholder}config/default.json`;
const defaultVarConfig = `${modulePathPlaceholder}config/app-setup/vars.json`;

export type YargsArgOptions = Record<string, yargs.Options>;

/**
 * CLI options needed for performing meta-process of app initialization.
 * These options doesn't contribute to components-js vars normally.
 */
export const BASE_YARGS_ARG_OPTIONS: YargsArgOptions = {
  config: { type: 'string', alias: 'c', default: defaultConfig, requiresArg: true },
  loggingLevel: { type: 'string', alias: 'l', default: 'info', requiresArg: true },
  mainModulePath: { type: 'string', alias: 'm', requiresArg: true },
  varConfig: { type: 'string', alias: 'v', default: defaultVarConfig, requiresArg: true },
};

export interface YargvOptions {
  usage?: string;
  strictMode?: boolean;
  // @see http://yargs.js.org/docs/#api-reference-envprefix
  loadFromEnv?: boolean;
  envVarPrefix?: string;
}

export type VarRecord = Record<string, unknown>;

export class VarResolver extends AsyncHandler<string[], VarRecord> {
  protected readonly yargsArgOptions: YargsArgOptions;
  protected readonly effectiveYargsArgOptions: YargsArgOptions;
  protected readonly yargvOptions: YargvOptions;
  protected readonly varComputers: Record<string, VarComputer>;

  /**
   * @param yargsArgOptions - record of option to it's yargs opt config. @range {json}
   * @param yargvOptions - options to configure yargv. @range {json}
   * @param varComputers  - record of componentsjs var-iri to VarComputer.
   */
  public constructor(
    yargsArgOptions: YargsArgOptions, yargvOptions: YargvOptions, varComputers: Record<string, VarComputer>,
  ) {
    super();
    this.yargsArgOptions = yargsArgOptions;
    this.effectiveYargsArgOptions = {
      ...yargsArgOptions,
      ...BASE_YARGS_ARG_OPTIONS,
    };
    this.yargvOptions = yargvOptions;
    this.varComputers = varComputers;
  }

  private async parseArgs(argv: readonly string[]): Promise<yargs.Arguments> {
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

    yArgv = yArgv.check((args): boolean => {
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
    }).options(this.effectiveYargsArgOptions);

    return yArgv.parse();
  }

  private async computeVars(args: yargs.Arguments): Promise<Record<string, any>> {
    const vars: Record<string, any> = {};
    for (const varId of Object.keys(this.varComputers)) {
      const varComputer = this.varComputers[varId];
      try {
        vars[varId] = await varComputer.handle(args);
      } catch (err: unknown) {
        throw new Error(`Error in computing value for variable ${varId}: ${createErrorMessage(err)}`);
      }
    }
    return vars;
  }

  public async handle(argv: readonly string[]): Promise<VarRecord> {
    const args = await this.parseArgs(argv);
    return this.computeVars(args);
  }
}
