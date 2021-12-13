/* eslint-disable unicorn/no-process-exit */
import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions, LogLevel } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import yargs from 'yargs';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage } from '../util/errors/ErrorUtil';
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
    const componentsManager = await this.createComponentsManager(loaderProperties, configFile);
    const defaultVariables = await this.resolveVariables(componentsManager, []);
    await this.startApp(componentsManager, { ...defaultVariables, ...variables });
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

    const config = resolveAssetPath(params.config);
    this.createComponentsManager(loaderProperties, config)
      .then((componentsManager): Promise<void> =>
        this.resolveVariables(componentsManager, argv).then(
          (vars): Promise<void> => this.startApp(componentsManager, vars),
          (error): void => this.writeError(stderr, `Could not load config variables from ${config}`, error),
        ).catch((error): void => {
          this.logger.error(`Could not start server: ${error}`);
          process.exit(1);
        }))
      .catch((error): void => this.writeError(stderr, `Could not build the config files from ${config}`, error));
  }

  /**
   * Writes the given message and error to the `stderr` and exits the process.
   */
  private writeError(stderr: WriteStream, message: string, error: Error): never {
    stderr.write(`${message}\nCause:\n${createErrorMessage(error)}\n`);
    stderr.write(`${error.stack}\n`);
    process.exit(1);
  }

  private async resolveVariables(componentsManager: ComponentsManager<VarResolver>, argv: string[]):
  Promise<VariableValues> {
    // Create a resolver, that resolves componentsjs variables from cli-params
    const resolver = await componentsManager.instantiate(DEFAULT_VAR_RESOLVER, {});
    //  Using varResolver resolve variables
    return resolver.handleSafe(argv);
  }

  private async startApp(componentsManager: ComponentsManager<App>, variables: VariableValues): Promise<void> {
    // Create app
    const app = await componentsManager.instantiate(DEFAULT_APP, { variables });
    // Execute app
    await app.start();
  }

  /**
   * Creates the Components Manager that will be used for instantiating.
   * Typing is set to `any` since it will be used for instantiating multiple objects.
   */
  public async createComponentsManager(
    loaderProperties: IComponentsManagerBuilderOptions<any>,
    configFile: string,
  ): Promise<ComponentsManager<any>> {
    // Set up Components.js
    const componentsManager = await ComponentsManager.build(loaderProperties);
    await componentsManager.configRegistry.register(configFile);
    return componentsManager;
  }
}
