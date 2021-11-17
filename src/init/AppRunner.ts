/* eslint-disable unicorn/no-process-exit */

import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions, LogLevel } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import yargs from 'yargs';
import { getLoggerFor } from '../logging/LogUtil';
import { ensureTrailingSlash, resolveAssetPath } from '../util/PathUtil';
import type { App } from './App';
import type { VarResolver } from './VarResolver';
import { baseYargsOptions } from './VarResolver';

const varConfigComponentIri = 'urn:solid-server-app-setup:default:VarResolver';
const appComponentIri = 'urn:solid-server:default:App';

export interface CliParams {
  loggingLevel: string;
  port: number;
  baseUrl?: string;
  rootFilePath?: string;
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
    const app = await this.createComponent(loaderProperties, configFile, variableParams, appComponentIri);
    await app.start();
  }

  /**
   * Starts the server as a command-line application.
   * Made non-async to lower the risk of unhandled promise rejections.
   * @param args - Command line arguments.
   * @param stderr - Standard error stream.
   */
  public async runCli({
    argv = process.argv,
    stderr = process.stderr,
  }: {
    argv?: string[];
    stdin?: ReadStream;
    stdout?: WriteStream;
    stderr?: WriteStream;
  } = {}): Promise<void> {
    // Parse the command-line arguments
    const params = await yargs(argv.slice(2))
      .usage('node ./bin/server.js [args]')
      .options(baseYargsOptions)
      .parse();

    // Gather settings for instantiating the server
    const loaderProperties = {
      mainModulePath: resolveAssetPath(params.mainModulePath as string),
      dumpErrorState: true,
      logLevel: params.loggingLevel as LogLevel,
    };

    // Create varResolver
    const varConfigFile = resolveAssetPath(params.varConfig as string);
    const varResolver = await this.createComponent(
      loaderProperties as IComponentsManagerBuilderOptions<VarResolver>, varConfigFile, {}, varConfigComponentIri,
    );
    // Resolve vars for app startup
    const vars = await varResolver.resolveVars(argv);

    const configFile = resolveAssetPath(params.config as string);
    let app: App;

    // Create app
    try {
      app = await this.createComponent(
        loaderProperties as IComponentsManagerBuilderOptions<App>, configFile, vars, appComponentIri,
      );
    } catch (error: unknown) {
      stderr.write(`Error: could not instantiate server from ${configFile}\n`);
      stderr.write(`${(error as Error).stack}\n`);
      process.exit(1);
    }

    // Execute app
    try {
      await app.start();
    } catch (error: unknown) {
      this.logger.error(`Could not start server: ${error}`, { error });
      process.exit(1);
    }
  }

  public async createComponent<TComp>(
    loaderProperties: IComponentsManagerBuilderOptions<TComp>,
    configFile: string,
    variables: Record<string, any>,
    componentIri: string,
  ): Promise<TComp> {
    // Set up Components.js
    const componentsManager = await ComponentsManager.build(loaderProperties);
    await componentsManager.configRegistry.register(configFile);

    // Create the app
    return await componentsManager.instantiate(componentIri, { variables });
  }
}
