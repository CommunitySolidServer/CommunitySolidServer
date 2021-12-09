/* eslint-disable unicorn/no-process-exit */
import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions, LogLevel } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import yargs from 'yargs';
import { createErrorMessage } from '..';
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
      .then(
        (vars): Promise<void> => this.startApp(loaderProperties, resolveAssetPath(params.config), vars),
        (error): void => this.writeError(stderr, 'Could not load config variables', error),
      )
      .catch((error): void => this.writeError(stderr, 'Could not start the server', error));
  }

  /**
   * Writes the given message and error to the `stderr` and exits the process.
   */
  private writeError(stderr: WriteStream, message: string, error: Error): never {
    stderr.write(`${message}\nCause:\n${createErrorMessage(error)}\n`);
    stderr.write(`${error.stack}\n`);
    process.exit(1);
  }

  private async resolveVariables(
    loaderProperties: IComponentsManagerBuilderOptions<VarResolver>,
    configFile: string, argv: string[],
  ): Promise<VariableValues> {
    // Create a resolver, that resolves componentsjs variables from cli-params
    const resolver = await this.createComponent(loaderProperties, configFile, {}, DEFAULT_VAR_RESOLVER);
    //  Using varResolver resolve variables
    return resolver.handle(argv);
  }

  private async startApp(
    loaderProperties: IComponentsManagerBuilderOptions<App>,
    configFile: string, vars: VariableValues,
  ): Promise<void> {
    // Create app
    const app = await this.createComponent(loaderProperties, configFile, vars, DEFAULT_APP);
    // Execute app
    await app.start();
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
