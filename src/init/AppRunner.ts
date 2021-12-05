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
    const params = this.parseCliParams(argv);

    // Gather settings for instantiating VarResolver
    const loaderProperties = {
      mainModulePath: resolveAssetPath(params.mainModulePath),
      dumpErrorState: true,
      logLevel: params.loggingLevel as LogLevel,
    };

    // Create a resolver, that resolves componentsjs variables from cli-params
    const varConfigFile = resolveAssetPath(params.varConfig);
    this.createComponent(
      loaderProperties as IComponentsManagerBuilderOptions<VarResolver>, varConfigFile, {}, DEFAULT_VAR_RESOLVER,
    ).then(
    //  Using varResolver resolve vars and start app
      async(varResolver): Promise<void> => {
        let vars: VariableValues;
        try {
          vars = await varResolver.handle(argv);
        } catch (error: unknown) {
          throw new VError(error as Error, 'Error in computing variables');
        }
        return this.startApp(
          loaderProperties, resolveAssetPath(params.config), vars as unknown as Record<string, any>,
        );
      },

      (error): void => {
        throw new VError(error as Error, `Error in loading variable configuration from ${varConfigFile}`);
      },
    ).catch((error): void => {
      stderr.write(`Could not start the server\nCause:\n${error.message}\n`);
      const stack = error instanceof VError ? error.cause()?.stack : error.stack;
      stderr.write(`${stack}\n`);
      process.exit(1);
    });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private parseCliParams(argv: string[]) {
    // eslint-disable-next-line no-sync
    return setupBaseArgs(yargs(argv.slice(2))
      .usage('node ./bin/server.js [args]')).parseSync();
  }

  private async startApp(
    loaderProperties: IComponentsManagerBuilderOptions<App>,
    configFile: string, vars: Record<string, any>,
  ): Promise<void> {
    let app: App;
    // Create app
    try {
      app = await this.createComponent(loaderProperties, configFile, vars, DEFAULT_APP);
    } catch (error: unknown) {
      throw new VError(error as Error, `Error: could not instantiate server from ${configFile}`);
    }

    // Execute app
    try {
      await app.start();
    } catch (error: unknown) {
      throw new VError(error as Error, 'Could not start server');
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

    // Create the component
    return await componentsManager.instantiate(componentIri, { variables });
  }
}
