/* eslint-disable unicorn/no-process-exit */

import type { ReadStream, WriteStream } from 'tty';
import type { IComponentsManagerBuilderOptions, LogLevel } from 'componentsjs';
import { ComponentsManager } from 'componentsjs';
import yargs from 'yargs';
import { getLoggerFor } from '../logging/LogUtil';
import { absoluteFilePath, ensureTrailingSlash, joinFilePath } from '../util/PathUtil';
import type { Initializer } from './Initializer';

export class CliRunner {
  private readonly logger = getLoggerFor(this);

  /**
   * Generic run function for starting the server from a given config
   * Made run to be non-async to lower the chance of unhandled promise rejection errors in the future.
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
      .check((args, options): boolean => {
        // Only take flags as arguments, not filenames
        if (args._ && args._.length > 0) {
          throw new Error(`Unsupported arguments: ${args._.join('", "')}`);
        }
        for (const key in args) {
          // Skip filename arguments (_) and the script name ($0)
          if (key !== '_' && key !== '$0') {
            // Check if the argument occurs in the provided options list
            if (!options[key]) {
              throw new Error(`Unknown option: "${key}"`);
            }
            // Check if the argument actually has a value ('> ./bin/server.js -s' is not valid)
            if (!args[key]) {
              throw new Error(`Missing value for argument "${key}"`);
            }
            // Check if the argument only has 1 value
            if (Array.isArray(args[key])) {
              throw new Error(`Multiple values were provided for: "${key}", [${args[key]}]`);
            }
          }
        }
        return true;
      })
      .options({
        baseUrl: { type: 'string', alias: 'b' },
        config: { type: 'string', alias: 'c' },
        loggingLevel: { type: 'string', alias: 'l', default: 'info' },
        mainModulePath: { type: 'string', alias: 'm' },
        idpTemplateFolder: { type: 'string' },
        port: { type: 'number', alias: 'p', default: 3000 },
        rootFilePath: { type: 'string', alias: 'f', default: './' },
        sparqlEndpoint: { type: 'string', alias: 's' },
        podConfigJson: { type: 'string', default: './pod-config.json' },
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
      'urn:solid-server:default:variable:podConfigJson':
        this.resolveFilePath(params.podConfigJson),
      'urn:solid-server:default:variable:idpTemplateFolder':
         this.resolveFilePath(params.idpTemplateFolder, 'templates/idp'),
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
