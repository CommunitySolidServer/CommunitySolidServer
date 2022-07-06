/* eslint-disable unicorn/no-process-exit */
import type { WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import yargs from 'yargs';
import { LOG_LEVELS } from '../logging/LogLevel';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage, isError } from '../util/errors/ErrorUtil';
import { resolveModulePath, resolveAssetPath } from '../util/PathUtil';
import type { App } from './App';
import type { CliResolver } from './CliResolver';
import type { CliArgv, VariableBindings } from './variables/Types';

const DEFAULT_CONFIG = resolveModulePath('config/default.json');

const DEFAULT_CLI_RESOLVER = 'urn:solid-server-app-setup:default:CliResolver';
const DEFAULT_APP = 'urn:solid-server:default:App';

const CORE_CLI_PARAMETERS = {
  config: { type: 'string', alias: 'c', default: DEFAULT_CONFIG, requiresArg: true },
  loggingLevel: { type: 'string', alias: 'l', default: 'info', requiresArg: true, choices: LOG_LEVELS },
  mainModulePath: { type: 'string', alias: 'm', requiresArg: true },
} as const;

const ENV_VAR_PREFIX = 'CSS';

/**
 * A class that can be used to instantiate and start a server based on a Component.js configuration.
 */
export class AppRunner {
  private readonly logger = getLoggerFor(this);

  /**
   * Starts the server with a given config.
   * This method can be used to start the server from within another JavaScript application.
   * Keys of the `variableBindings` object should be Components.js variables.
   * E.g.: `{ 'urn:solid-server:default:variable:rootFilePath': '.data' }`.
   *
   * @param loaderProperties - Components.js loader properties.
   * @param configFile - Path to the server config file.
   * @param variableBindings - Parameters to pass into the VariableResolver.
   */
  public async run(
    loaderProperties: IComponentsManagerBuilderOptions<App>,
    configFile: string,
    variableBindings: VariableBindings,
  ): Promise<void> {
    const app = await this.create(loaderProperties, configFile, variableBindings);
    await app.start();
  }

  /**
   * Returns an App object, created with the given config, that can start and stop the Solid server.
   * Keys of the `variableBindings` object should be Components.js variables.
   * E.g.: `{ 'urn:solid-server:default:variable:rootFilePath': '.data' }`.
   *
   * @param loaderProperties - Components.js loader properties.
   * @param configFile - Path to the server config file.
   * @param variableBindings - Bindings of Components.js variables.
   */
  public async create(
    loaderProperties: IComponentsManagerBuilderOptions<App>,
    configFile: string,
    variableBindings: VariableBindings,
  ): Promise<App> {
    // Create a resolver to translate (non-core) CLI parameters into values for variables
    const componentsManager = await this.createComponentsManager<App>(loaderProperties, configFile);

    // Create the application using the translated variable values
    return componentsManager.instantiate(DEFAULT_APP, { variables: variableBindings });
  }

  /**
   * Starts the server as a command-line application.
   * Will exit the process on failure.
   *
   * Made non-async to lower the risk of unhandled promise rejections.
   * This is only relevant when this is used to start as a Node.js application on its own,
   * if you use this as part of your code you probably want to use the async version.
   *
   * @param argv - Command line arguments.
   * @param stderr - Stream that should be used to output errors before the logger is enabled.
   */
  public runCliSync({ argv, stderr = process.stderr }: { argv?: CliArgv; stderr?: WriteStream }): void {
    this.runCli(argv).catch((error): never => {
      stderr.write(createErrorMessage(error));
      process.exit(1);
    });
  }

  /**
   * Starts the server as a command-line application.
   * @param argv - Command line arguments.
   */
  public async runCli(argv?: CliArgv): Promise<void> {
    const app = await this.createCli(argv);
    try {
      await app.start();
    } catch (error: unknown) {
      this.logger.error(`Could not start the server: ${createErrorMessage(error)}`);
      this.resolveError('Could not start the server', error);
    }
  }

  /**
   * Returns an App object, created by parsing the Command line arguments, that can start and stop the Solid server.
   * Will exit the process on failure.
   *
   * @param argv - Command line arguments.
   */
  public async createCli(argv: CliArgv = process.argv): Promise<App> {
    // Parse only the core CLI arguments needed to load the configuration
    const yargv = yargs(argv.slice(2))
      .usage('node ./bin/server.js [args]')
      .options(CORE_CLI_PARAMETERS)
      // We disable help here as it would only show the core parameters
      .help(false)
      // We also read from environment variables
      .env(ENV_VAR_PREFIX);

    const params = await yargv.parse();

    const loaderProperties = {
      mainModulePath: resolveAssetPath(params.mainModulePath),
      dumpErrorState: true,
      logLevel: params.loggingLevel,
    };

    const config = resolveAssetPath(params.config);

    // Create the Components.js manager used to build components from the provided config
    let componentsManager: ComponentsManager<any>;
    try {
      componentsManager = await this.createComponentsManager(loaderProperties, config);
    } catch (error: unknown) {
      // Print help of the expected core CLI parameters
      const help = await yargv.getHelp();
      this.resolveError(`${help}\n\nCould not build the config files from ${config}`, error);
    }

    // Build the CLI components and use them to generate values for the Components.js variables
    const variables = await this.resolveVariables(componentsManager, argv);

    // Build and start the actual server application using the generated variable values
    return await this.createApp(componentsManager, variables);
  }

  /**
   * Creates the Components Manager that will be used for instantiating.
   */
  public async createComponentsManager<T>(
    loaderProperties: IComponentsManagerBuilderOptions<T>,
    configFile: string,
  ): Promise<ComponentsManager<T>> {
    const componentsManager = await ComponentsManager.build(loaderProperties);
    await componentsManager.configRegistry.register(configFile);
    return componentsManager;
  }

  /**
   * Handles the first Components.js instantiation,
   * where CLI settings and variable mappings are created.
   */
  private async resolveVariables(componentsManager: ComponentsManager<CliResolver>, argv: string[]):
  Promise<VariableBindings> {
    try {
      // Create a CliResolver, which combines a CliExtractor and a VariableResolver
      const resolver = await componentsManager.instantiate(DEFAULT_CLI_RESOLVER, {});
      // Convert CLI args to CLI bindings
      const cliValues = await resolver.cliExtractor.handleSafe(argv);
      // Convert CLI bindings into variable bindings
      return await resolver.settingsResolver.handleSafe(cliValues);
    } catch (error: unknown) {
      this.resolveError(`Could not load the config variables`, error);
    }
  }

  /**
   * The second Components.js instantiation,
   * where the App is created and started using the variable mappings.
   */
  private async createApp(componentsManager: ComponentsManager<App>, variables: Record<string, unknown>): Promise<App> {
    try {
      // Create the app
      return await componentsManager.instantiate(DEFAULT_APP, { variables });
    } catch (error: unknown) {
      this.resolveError(`Could not create the server`, error);
    }
  }

  /**
   * Throws a new error that provides additional information through the extra message.
   * Also appends the stack trace to the message.
   * This is needed for errors that are thrown before the logger is created as we can't log those the standard way.
   */
  private resolveError(message: string, error: unknown): never {
    let errorMessage = `${message}\nCause: ${createErrorMessage(error)}\n`;
    if (isError(error)) {
      errorMessage += `${error.stack}\n`;
    }
    throw new Error(errorMessage);
  }
}
