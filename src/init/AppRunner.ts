/* eslint-disable unicorn/no-process-exit */

import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions, LogLevel } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import VError from 'verror';
import yargs from 'yargs';
import { getLoggerFor } from '../logging/LogUtil';
import { resolveAssetPath } from '../util/PathUtil';
import type { App } from './App';
import type { VarResolver, VariableValues } from './variables/VarResolver';
import { setupBaseArgs } from './variables/VarResolver';

const DEFAULT_VAR_RESOLVER = 'urn:solid-server-app-setup:default:VarResolver';
const DEFAULT_APP = 'urn:solid-server:default:App';

export class AppRunner {
  private readonly logger = getLoggerFor(this);

  /**
   * Starts the server with a given config.
   * This method can be used to start the server from within another JavaScript application.
   * @param loaderProperties - Components.js loader properties.
   * @param configFile - Path to the server config file.
   * @param variables - Variables to pass into the config file.
   */
  public async run(
    loaderProperties: IComponentsManagerBuilderOptions<App>,
    configFile: string,
    variables: VariableValues,
  ): Promise<void> {
    const app = await this.createComponent(loaderProperties, configFile, variables, DEFAULT_APP);
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
    const params = setupBaseArgs(yargs(argv.slice(2))
      .usage('node ./bin/server.js [args]')).parseSync();

    // Gather settings for instantiating VarResolver
    const loaderProperties = {
      mainModulePath: resolveAssetPath(params.mainModulePath),
      dumpErrorState: true,
      logLevel: params.loggingLevel as LogLevel,
    };

    const variableConfig = resolveAssetPath(params.varConfig);
    this.resolveVariables(loaderProperties, variableConfig, argv)
      .then((vars): Promise<void> => this.startApp(
        loaderProperties, resolveAssetPath(params.config), vars as unknown as Record<string, any>,
      ))
      .catch((error): void => {
        stderr.write(`Could not start the server\nCause:\n${error.message}\n`);
        const stack = error instanceof VError ? error.cause()?.stack : error.stack;
        stderr.write(`${stack}\n`);
        process.exit(1);
      });
  }

  private async fulfillOrChain<T>(promise: Promise<T>, errorMessage: string): Promise<T> {
    let val: T;
    try {
      val = await promise;
    } catch (error: unknown) {
      throw new VError(error as Error, errorMessage);
    }
    return val;
  }

  private async resolveVariables(
    loaderProperties: IComponentsManagerBuilderOptions<VarResolver>,
    configFile: string, argv: string[],
  ): Promise<VariableValues> {
    // Create a resolver, that resolves componentsjs variables from cli-params
    const resolver = await this.fulfillOrChain(
      this.createComponent(loaderProperties, configFile, {}, DEFAULT_VAR_RESOLVER),
      `Error in loading variable configuration from ${configFile}`,
    );
    //  Using varResolver resolve variables
    return this.fulfillOrChain(resolver.handle(argv), 'Error in computing variables');
  }

  private async startApp(
    loaderProperties: IComponentsManagerBuilderOptions<App>,
    configFile: string, vars: VariableValues,
  ): Promise<void> {
    // Create app
    const app = await this.fulfillOrChain(
      this.createComponent(loaderProperties, configFile, vars, DEFAULT_APP),
      `Error: could not instantiate server from ${configFile}`,
    );
    // Execute app
    await this.fulfillOrChain(app.start(), 'Could not start server');
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

    // Create the component
    return await componentsManager.instantiate(componentIri, { variables });
  }
}
