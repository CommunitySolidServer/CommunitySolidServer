/* eslint-disable unicorn/no-process-exit */

import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions, LogLevel } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import yargs from 'yargs';
import { getLoggerFor } from '../logging/LogUtil';
import { joinFilePath, ensureTrailingSlash, absoluteFilePath } from '../util/PathUtil';
import type { Initializer } from './Initializer';

export class CliRunner {
  private readonly logger = getLoggerFor(this);

  /**
   * Generic run function for starting the server from a given config
   * @param args - Command line arguments.
   * @param stderr - Standard error stream.
   */
  public run({
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
      .usage('node ./bin/server.js [args]')
      .options({
        baseUrl: { type: 'string', alias: 'b' },
        config: { type: 'string', alias: 'c' },
        loggingLevel: { type: 'string', alias: 'l', default: 'info' },
        mainModulePath: { type: 'string', alias: 'm' },
        podTemplateFolder: { type: 'string', alias: 't' },
        webViewsFolder: { type: 'string', alias: 'v' },
        port: { type: 'number', alias: 'p', default: 3000 },
        rootFilePath: { type: 'string', alias: 'f', default: './' },
        sparqlEndpoint: { type: 'string', alias: 's' },
      })
      .help();

    // Gather settings for instantiating the server
    const loaderProperties: IComponentsManagerBuilderOptions<Initializer> = {
      mainModulePath: this.resolveFilePath(params.mainModulePath),
      dumpErrorState: true,
      logLevel: params.loggingLevel as LogLevel,
    };
    const configFile = this.resolveFilePath(params.config, 'config/config-default.json');
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
  protected createVariables(params: Record<string, any>): Record<string, any> {
    return {
      'urn:solid-server:default:variable:baseUrl':
        params.baseUrl ? ensureTrailingSlash(params.baseUrl) : `http://localhost:${params.port}/`,
      'urn:solid-server:default:variable:loggingLevel': params.loggingLevel,
      'urn:solid-server:default:variable:port': params.port,
      'urn:solid-server:default:variable:rootFilePath':
        this.resolveFilePath(params.rootFilePath),
      'urn:solid-server:default:variable:sparqlEndpoint': params.sparqlEndpoint,
      'urn:solid-server:default:variable:podTemplateFolder':
         this.resolveFilePath(params.podTemplateFolder, 'templates/pod'),
      'urn:solid-server:default:variable:webViewsFolder':
         this.resolveFilePath(params.webViewsFolder, 'templates/views'),
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
