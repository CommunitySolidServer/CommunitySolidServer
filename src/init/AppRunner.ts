/* eslint-disable unicorn/no-process-exit */
import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import yargs from 'yargs';
import type { LogLevel } from '../logging/LogLevel';
import { LOG_LEVELS } from '../logging/LogLevel';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { modulePathPlaceholder, resolveAssetPath } from '../util/PathUtil';
import type { App } from './App';
import type { CliExtractor } from './cli/CliExtractor';
import type { VariableResolver } from './variables/VariableResolver';

const defaultConfig = `${modulePathPlaceholder}config/default.json`;

const DEFAULT_CLI_RESOLVER = 'urn:solid-server-app-setup:default:CliResolver';
const DEFAULT_APP = 'urn:solid-server:default:App';

const baseArgs = {
  config: { type: 'string', alias: 'c', default: defaultConfig, requiresArg: true },
  loggingLevel: { type: 'string', alias: 'l', default: 'info', requiresArg: true, choices: LOG_LEVELS },
  mainModulePath: { type: 'string', alias: 'm', requiresArg: true },
} as const;

// The components needed by the AppRunner to start up the server
interface CliResolver {
  extractor?: CliExtractor;
  resolver: VariableResolver;
}

export class AppRunner {
  private readonly logger = getLoggerFor(this);

  /**
   * Starts the server with a given config.
   * This method can be used to start the server from within another JavaScript application.
   * @param loaderProperties - Components.js loader properties.
   * @param configFile - Path to the server config file.
   * @param parameters - Parameters to pass into the VariableResolver.
   */
  public async run(
    loaderProperties: IComponentsManagerBuilderOptions<App>,
    configFile: string,
    parameters: Record<string, unknown>,
  ): Promise<void> {
    const componentsManager = await this.createComponentsManager(loaderProperties, configFile);
    const resolver = await componentsManager.instantiate(DEFAULT_CLI_RESOLVER, {});
    const variables = await resolver.resolver.handleSafe(parameters);
    await this.startApp(componentsManager, variables);
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
    // Minimal parsing of the CLI parameters, so we can create a CliResolver
    // eslint-disable-next-line no-sync
    const params = yargs(argv.slice(2))
      .usage('node ./bin/server.js [args]')
      .options(baseArgs)
      .parseSync();

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

  private async resolveVariables(componentsManager: ComponentsManager<CliResolver>, argv: string[]):
  Promise<Record<string, unknown>> {
    // Create a resolver, that resolves componentsjs variables from cli-params
    const resolver = await componentsManager.instantiate(DEFAULT_CLI_RESOLVER, {});
    // Extract values from CLI parameters
    if (!resolver.extractor) {
      throw new Error('No CliExtractor is defined.');
    }
    const cliValues = await resolver.extractor.handleSafe(argv);
    //  Using varResolver resolve variables
    return await resolver.resolver.handleSafe(cliValues);
  }

  private async startApp(componentsManager: ComponentsManager<App>, variables: Record<string, unknown>): Promise<void> {
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
