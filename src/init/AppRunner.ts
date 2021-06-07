/* eslint-disable unicorn/no-process-exit */

import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions, LogLevel } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import yargs from 'yargs';
import { getLoggerFor } from '../logging/LogUtil';
import { absoluteFilePath, ensureTrailingSlash, joinFilePath } from '../util/PathUtil';
import type { Initializer } from './Initializer';

export class AppRunner {
  private readonly logger = getLoggerFor(this);

  /**
   * Generic run function for starting the server from JavaScript for a given config.
   * @param loaderProperties - Components.js loader properties.
   * @param configFile - Path to the server config file.
   * @param variableParams - Variables to pass into the config file.
   */
  public async run(
    loaderProperties: IComponentsManagerBuilderOptions<Initializer>,
    configFile: string,
    variableParams: ConfigVariables,
  ): Promise<void> {
    const variables = this.createVariables(variableParams);
    const initializer = await this.createInitializer(loaderProperties, configFile, variables);
    await initializer.handleSafe();
  }

  /**
   * Generic run function for starting the server on the CLI from a given config
   * Made run to be non-async to lower the chance of unhandled promise rejection errors in the future.
   * @param args - Command line arguments.
   * @param stderr - Standard error stream.
   */
  public runCli({
    argv = process.argv,
    stderr = process.stderr,
  }: {
    argv?: string[];
    stdin?: ReadStream;
    stdout?: WriteStream;
    stderr?: WriteStream;
  } = {}): void {
    // Parse the command-line arguments
    const { argv: params } = yargs(argv.slice(2))
      .strict()
      .usage('node ./bin/server.js [args]')
      .check((args): boolean => {
        if (args._.length > 0) {
          throw new Error(`Unsupported positional arguments: "${args._.join('", "')}"`);
        }
        for (const key of Object.keys(args)) {
          // We have no options that allow for arrays
          const val = args[key];
          if (key !== '_' && Array.isArray(val)) {
            throw new Error(`Multiple values were provided for: "${key}": "${val.join('", "')}"`);
          }
        }
        return true;
      })
      .options({
        baseUrl: { type: 'string', alias: 'b', requiresArg: true },
        config: { type: 'string', alias: 'c', requiresArg: true },
        loggingLevel: { type: 'string', alias: 'l', default: 'info', requiresArg: true },
        mainModulePath: { type: 'string', alias: 'm', requiresArg: true },
        idpTemplateFolder: { type: 'string', requiresArg: true },
        port: { type: 'number', alias: 'p', default: 3000, requiresArg: true },
        rootFilePath: { type: 'string', alias: 'f', default: './', requiresArg: true },
        showStackTrace: { type: 'boolean', alias: 't', default: false },
        sparqlEndpoint: { type: 'string', alias: 's', requiresArg: true },
        podConfigJson: { type: 'string', default: './pod-config.json', requiresArg: true },
      })
      .help();

    // Gather settings for instantiating the server
    const loaderProperties: IComponentsManagerBuilderOptions<Initializer> = {
      mainModulePath: this.resolveFilePath(params.mainModulePath),
      dumpErrorState: true,
      logLevel: params.loggingLevel as LogLevel,
    };
    const configFile = this.resolveFilePath(params.config, 'config/default.json');
    const variables = this.createVariables(params);

    // Create and execute the server initializer
    this.createInitializer(loaderProperties, configFile, variables)
      .then(
        async(initializer): Promise<void> => initializer.handleSafe(),
        (error: Error): void => {
          // Instantiation of components has failed, so there is no logger to use
          stderr.write(`Error: could not instantiate server from ${configFile}\n`);
          stderr.write(`${error.stack}\n`);
          process.exit(1);
        },
      ).catch((error): void => {
        this.logger.error(`Could not initialize server: ${error}`, { error });
        process.exit(1);
      });
  }

  /**
   * Resolves a path relative to the current working directory,
   * falling back to a path relative to this module.
   */
  protected resolveFilePath(cwdPath?: string | null, modulePath = ''): string {
    return typeof cwdPath === 'string' ?
      absoluteFilePath(cwdPath) :
      joinFilePath(__dirname, '../../', modulePath);
  }

  /**
   * Translates command-line parameters into configuration variables
   */
  protected createVariables(params: ConfigVariables): Record<string, any> {
    return {
      'urn:solid-server:default:variable:baseUrl':
        params.baseUrl ? ensureTrailingSlash(params.baseUrl) : `http://localhost:${params.port}/`,
      'urn:solid-server:default:variable:loggingLevel': params.loggingLevel,
      'urn:solid-server:default:variable:port': params.port,
      'urn:solid-server:default:variable:rootFilePath':
        this.resolveFilePath(params.rootFilePath),
      'urn:solid-server:default:variable:sparqlEndpoint': params.sparqlEndpoint,
      'urn:solid-server:default:variable:showStackTrace': params.showStackTrace,
      'urn:solid-server:default:variable:podConfigJson':
        this.resolveFilePath(params.podConfigJson),
      'urn:solid-server:default:variable:idpTemplateFolder':
         this.resolveFilePath(params.idpTemplateFolder, 'templates/idp'),
    };
  }

  /**
   * Creates the server initializer
   */
  protected async createInitializer(
    componentsProperties: IComponentsManagerBuilderOptions<Initializer>,
    configFile: string,
    variables: Record<string, any>,
  ): Promise<Initializer> {
    const componentsManager = await ComponentsManager.build(componentsProperties);

    const initializer = 'urn:solid-server:default:Initializer';
    await componentsManager.configRegistry.register(configFile);
    return await componentsManager.instantiate(initializer, { variables });
  }
}

export interface ConfigVariables {
  loggingLevel: string;
  port: number;
  baseUrl?: string;
  rootFilePath?: string;
  sparqlEndpoint?: string;
  showStackTrace?: boolean;
  podConfigJson?: string;
  idpTemplateFolder?: string;
}
