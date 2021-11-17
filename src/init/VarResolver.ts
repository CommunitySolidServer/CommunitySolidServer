import yargs from 'yargs';
import { AsyncHandler } from '../util/handlers/AsyncHandler';
import { ensureTrailingSlash, modulePathPlaceholder, resolveAssetPath } from '../util/PathUtil';

const defaultConfig = `${modulePathPlaceholder}config/default.json`;
const defaultVarConfig = `${modulePathPlaceholder}config/app-setup/vars.json`;

/**
 * CLI options needed for performing meta-process of app initialization.
 * These options doesn't contribute to components-js vars normally.
 */
export const baseYargsOptions: Record<string, yargs.Options> = {
  config: { type: 'string', alias: 'c', default: defaultConfig, requiresArg: true },
  loggingLevel: { type: 'string', alias: 'l', default: 'info', requiresArg: true },
  mainModulePath: { type: 'string', alias: 'm', requiresArg: true },
  varConfig: { type: 'string', alias: 'v', default: defaultVarConfig, requiresArg: true },
};

/**
 * A handler that takes args, and returns computed variable value
 */
export abstract class VarComputer extends AsyncHandler<yargs.Arguments, any> {
  public abstract handle(args: yargs.Arguments): Promise<any>;
}

// Currently componentsjs-builder giving error, if we use external TSTypeReference.
// Re-definition is temporary work around.
export interface IYargsOptions extends yargs.Options {
  alias?: string | readonly string[];
  default?: any;
  desc?: string;
  requiresArg?: boolean;
  type?: 'array' | 'count' | yargs.PositionalOptionsType;
}

export interface IVarResolverOptions {
  yargsOptions: Record<string, IYargsOptions>;
  varComputers: Record<string, VarComputer>;
  usage?: string;
  strictMode?: boolean;
}

export class VarResolver {
  protected readonly opts: IVarResolverOptions;
  protected readonly effectiveYargsOptions: Record<string, yargs.Options>;

  public constructor(opts: IVarResolverOptions) {
    this.opts = opts;
    this.effectiveYargsOptions = {
      ...opts.yargsOptions,
      ...baseYargsOptions,
    };
  }

  private async parseArgs(argv: readonly string[]): Promise<yargs.Arguments> {
    let yArgv = yargs(argv.slice(2));
    if (this.opts.usage !== undefined) {
      yArgv = yArgv.usage(this.opts.usage);
    }
    if (this.opts.strictMode) {
      yArgv = yArgv.strict();
    }

    yArgv = yArgv.check((args): boolean => {
      if (args._.length > 0) {
        throw new Error(`Unsupported positional arguments: "${args._.join('", "')}"`);
      }
      for (const key of Object.keys(args)) {
        const val = args[key];
        if (key !== '_' && Array.isArray(val)) {
          throw new Error(`Multiple values were provided for: "${key}": "${val.join('", "')}"`);
        }
      }
      return true;
    }).options(this.effectiveYargsOptions);

    return yArgv.parse();
  }

  private async computeVars(args: yargs.Arguments): Promise<Record<string, any>> {
    const vars: Record<string, any> = {};
    for (const varId of Object.keys(this.opts.varComputers)) {
      const varComputer = this.opts.varComputers[varId];
      try {
        vars[varId] = await varComputer.handle(args);
      } catch (err: unknown) {
        throw new Error(`Error in computing value for variable ${varId}: ${err}`);
      }
    }
    return vars;
  }

  public async resolveVars(argv: readonly string[]): Promise<Record<string, any>> {
    const args = await this.parseArgs(argv);
    return this.computeVars(args);
  }
}

/**
 * Simple VarComputer that just extracts an arg from parsed args.
 */
export class ArgExtractor extends VarComputer {
  private readonly argKey: string;

  public constructor(argKey: string) {
    super();
    this.argKey = argKey;
  }

  public async handle(args: yargs.Arguments): Promise<any> {
    return args[this.argKey];
  }
}

export class AssetPathResolver extends VarComputer {
  private readonly pathArgKey: string;

  public constructor(pathArgKey: string) {
    super();
    this.pathArgKey = pathArgKey;
  }

  public async handle(args: yargs.Arguments): Promise<any> {
    const path = args[this.pathArgKey];
    if (typeof path !== 'string') {
      throw new Error(`Invalid ${this.pathArgKey} argument`);
    }
    return resolveAssetPath(path);
  }
}

/**
 * A handler to compute base-url from args
 */
export class BaseUrlComputer extends VarComputer {
  public async handle(args: yargs.Arguments): Promise<any> {
    return args.baseUrl ? ensureTrailingSlash(args.baseUrl as string) : `http://localhost:${args.port}/`;
  }
}
