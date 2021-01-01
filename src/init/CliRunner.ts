/* eslint-disable unicorn/no-process-exit */

import * as path from 'path';
import type { ReadStream, WriteStream } from 'tty';
import type { LoaderProperties } from 'componentsjs';
import { Loader } from 'componentsjs';
import yargs from 'yargs';
import { getLoggerFor } from '../logging/LogUtil';
import { ensureTrailingSlash } from '../util/PathUtil';
import type { Initializer } from './Initializer';

export class CliRunner {
  private readonly logger = getLoggerFor(this);

  /**
   * Generic run function for starting the server from a given config
   * @param args - Command line arguments.
   * @param stderr - Standard error stream.
   * @param loaderProperties - Components loader properties.
   */
  public run({
    argv = process.argv,
    stderr = process.stderr,
    loaderProperties = {
      mainModulePath: path.join(__dirname, '../../'),
    },
  }: {
    argv?: string[];
    stdin?: ReadStream;
    stdout?: WriteStream;
    stderr?: WriteStream;
    loaderProperties?: LoaderProperties;
  } = {}): void {
    // Parse the command-line arguments
    const { argv: params } = yargs(argv.slice(2))
      .usage('node ./bin/server.js [args]')
      .options({
        baseUrl: { type: 'string', alias: 'b' },
        config: { type: 'string', alias: 'c' },
        loggingLevel: { type: 'string', alias: 'l', default: 'info' },
        port: { type: 'number', alias: 'p', default: 3000 },
        rootFilePath: { type: 'string', alias: 'f' },
        sparqlEndpoint: { type: 'string', alias: 's' },
        podTemplateFolder: { type: 'string', alias: 't' },
      })
      .help();

    // Gather settings for instantiating the server
    const configFile = params.config ?
      path.join(process.cwd(), params.config) :
      path.join(__dirname, '/../../config/config-default.json');
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
   * Translates command-line parameters into configuration variables
   */
  protected createVariables(params: Record<string, any>): Record<string, any> {
    return {
      'urn:solid-server:default:variable:baseUrl':
        params.baseUrl ? ensureTrailingSlash(params.baseUrl) : `http://localhost:${params.port}/`,
      'urn:solid-server:default:variable:loggingLevel': params.loggingLevel,
      'urn:solid-server:default:variable:port': params.port,
      'urn:solid-server:default:variable:rootFilePath': params.rootFilePath ?? process.cwd(),
      'urn:solid-server:default:variable:sparqlEndpoint': params.sparqlEndpoint,
      'urn:solid-server:default:variable:podTemplateFolder':
        params.podTemplateFolder ?? path.join(__dirname, '../../templates'),
    };
  }

  /**
   * Creates the server initializer
   */
  protected async createInitializer(loaderProperties: LoaderProperties, configFile: string,
    variables: Record<string, any>): Promise<Initializer> {
    const loader = new Loader(loaderProperties);
    await loader.registerAvailableModuleResources();

    const initializer = 'urn:solid-server:default:Initializer';
    return await loader.instantiateFromUrl(initializer, configFile, undefined, { variables }) as Initializer;
  }
}
