/* eslint-disable unicorn/no-process-exit */

import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions, LogLevel } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import yargs from 'yargs';

import { getLoggerFor } from '../logging/LogUtil';
import { resolveAssetPath } from '../util/PathUtil';
import type { App } from './App';
import type { VarResolver, VarRecord } from './variables/VarResolver';
import { setupYargvWithBaseArgs } from './variables/VarResolver';

const varConfigComponentIri = 'urn:solid-server-app-setup:default:VarResolver';
const appComponentIri = 'urn:solid-server:default:App';

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
    variableParams: VarRecord,
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
    const params = setupYargvWithBaseArgs(yargs(argv.slice(2))
      .usage('node ./bin/server.js [args]')).parseSync();

    // Gather settings for instantiating VarResolver
    const loaderProperties = {
      mainModulePath: resolveAssetPath(params.mainModulePath),
      dumpErrorState: true,
      logLevel: params.loggingLevel as LogLevel,
    };

    // Create varResolver
    const varConfigFile = resolveAssetPath(params.varConfig);
    this.createComponent(
      loaderProperties as IComponentsManagerBuilderOptions<VarResolver>, varConfigFile, {}, varConfigComponentIri,
    ).then(
    //  Using varResolver resolve vars and start app
      async(varResolver): Promise<void> => {
        let vars: VarRecord;
        try {
          vars = await varResolver.handle(argv);
        } catch (error: unknown) {
          this.exitWithError(error as Error, 'Error in computing variables', stderr);
        }
        return this.initApp(
          loaderProperties, resolveAssetPath(params.config), vars as unknown as Record<string, any>, stderr,
        );
      },

      (error): void => this.exitWithError(
        error, `Error in loading variable configuration from ${varConfigFile}`, stderr,
      ),
    ).catch((error): void => this.exitWithError(error, 'Could not start the server', stderr));
  }

  private exitWithError(error: Error, message: string, stderr: WriteStream): never {
    stderr.write(`message\n`);
    stderr.write(`${error.stack}\n`);
    process.exit(1);
  }

  private async initApp(
    loaderProperties: IComponentsManagerBuilderOptions<App>,
    configFile: string, vars: Record<string, any>, stderr: WriteStream,
  ): Promise<void> {
    let app: App;
    // Create app
    try {
      app = await this.createComponent(loaderProperties, configFile, vars, appComponentIri);
    } catch (error: unknown) {
      this.exitWithError(error as Error, `Error: could not instantiate server from ${configFile}`, stderr);
    }

    // Execute app
    try {
      await app.start();
    } catch (error: unknown) {
      this.exitWithError(error as Error, 'Could not start server', stderr);
    }
  }

  private async createComponent<TComp>(
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
