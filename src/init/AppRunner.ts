/* eslint-disable unicorn/no-process-exit */

import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions, LogLevel } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import yargs from 'yargs';
import { getLoggerFor } from '../logging/LogUtil';
import { ensureTrailingSlash, resolveAssetPath, modulePathPlaceholder } from '../util/PathUtil';
import type { App } from './App';

const defaultConfig = `${modulePathPlaceholder}config/default.json`;

export interface CliParams {
  loggingLevel: string;
  port: number;
  baseUrl?: string;
  rootFilePath?: string;
  tempFilePath?: string;
  sparqlEndpoint?: string;
  showStackTrace?: boolean;
  podConfigJson?: string;
}

export class AppRunner {
  private readonly logger = getLoggerFor(this);

  /**
   * Starts the server with a given config.
   * This method can be used to start the server from within another JavaScript application.
   * @param loaderProperties - Components.js loader properties.
   * @param configFile - Path to the server config file.
   * @param variableParams - Variables to pass into the config file.
   */
  public async run(
    loaderProperties: IComponentsManagerBuilderOptions<App>,
    configFile: string,
    variableParams: CliParams,
  ): Promise<void> {
    const app = await this.createApp(loaderProperties, configFile, variableParams);
    await app.start();
  }

  /**
   * Starts the server as a command-line application.
   * Made non-async to lower the risk of unhandled promise rejections.
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
    // eslint-disable-next-line no-sync
    const params = yargs(argv.slice(2))
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
        config: { type: 'string', alias: 'c', default: defaultConfig, requiresArg: true },
        loggingLevel: { type: 'string', alias: 'l', default: 'info', requiresArg: true },
        mainModulePath: { type: 'string', alias: 'm', requiresArg: true },
        port: { type: 'number', alias: 'p', default: 3000, requiresArg: true },
        rootFilePath: { type: 'string', alias: 'f', default: './', requiresArg: true },
        tempFilePath: { type: 'string', default: './data-temp', requiresArg: true },
        showStackTrace: { type: 'boolean', alias: 't', default: false },
        sparqlEndpoint: { type: 'string', alias: 's', requiresArg: true },
        podConfigJson: { type: 'string', default: './pod-config.json', requiresArg: true },
      })
      .parseSync();

    // Gather settings for instantiating the server
    const loaderProperties: IComponentsManagerBuilderOptions<App> = {
      mainModulePath: resolveAssetPath(params.mainModulePath),
      dumpErrorState: true,
      logLevel: params.loggingLevel as LogLevel,
    };
    const configFile = resolveAssetPath(params.config);

    // Create and execute the app
    this.createApp(loaderProperties, configFile, params)
      .then(
        async(app): Promise<void> => app.start(),
        (error: Error): void => {
          // Instantiation of components has failed, so there is no logger to use
          stderr.write(`Error: could not instantiate server from ${configFile}\n`);
          stderr.write(`${error.stack}\n`);
          process.exit(1);
        },
      ).catch((error): void => {
        this.logger.error(`Could not start server: ${error}`, { error });
        process.exit(1);
      });
  }

  /**
   * Creates the main app object to start the server from a given config.
   * @param loaderProperties - Components.js loader properties.
   * @param configFile - Path to a Components.js config file.
   * @param variables - Variables to pass into the config file.
   */
  public async createApp(
    loaderProperties: IComponentsManagerBuilderOptions<App>,
    configFile: string,
    variables: CliParams | Record<string, any>,
  ): Promise<App> {
    // Translate command-line parameters if needed
    if (typeof variables.loggingLevel === 'string') {
      variables = this.createVariables(variables as CliParams);
    }

    // Set up Components.js
    const componentsManager = await ComponentsManager.build(loaderProperties);
    await componentsManager.configRegistry.register(configFile);

    // Create the app
    const app = 'urn:solid-server:default:App';
    return await componentsManager.instantiate(app, { variables });
  }

  /**
   * Translates command-line parameters into Components.js variables.
   */
  protected createVariables(params: CliParams): Record<string, any> {
    return {
      'urn:solid-server:default:variable:baseUrl':
        params.baseUrl ? ensureTrailingSlash(params.baseUrl) : `http://localhost:${params.port}/`,
      'urn:solid-server:default:variable:loggingLevel': params.loggingLevel,
      'urn:solid-server:default:variable:port': params.port,
      'urn:solid-server:default:variable:rootFilePath': resolveAssetPath(params.rootFilePath),
      'urn:solid-server:default:variable:tempFilePath': resolveAssetPath(params.tempFilePath),
      'urn:solid-server:default:variable:sparqlEndpoint': params.sparqlEndpoint,
      'urn:solid-server:default:variable:showStackTrace': params.showStackTrace,
      'urn:solid-server:default:variable:podConfigJson': resolveAssetPath(params.podConfigJson),
    };
  }
}
