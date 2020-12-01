import * as path from 'path';
import type { ReadStream, WriteStream } from 'tty';
import type { LoaderProperties } from 'componentsjs';
import { Loader } from 'componentsjs';
import yargs from 'yargs';
import { getLoggerFor } from '../logging/LogUtil';
import type { Setup } from './Setup';

const logger = getLoggerFor('CliRunner');

/**
 * Generic run function for starting the server from a given config
 * @param args - Command line arguments.
 * @param stdin - Standard input stream.
 * @param stdout - Standard output stream.
 * @param stderr - Standard error stream.
 * @param properties - Components loader properties.
 */
export const runCustom = function(
  args: string[],
  stdin: ReadStream,
  stdout: WriteStream,
  stderr: WriteStream,
  properties: LoaderProperties,
): void {
  const { argv } = yargs(args)
    .usage('node ./bin/server.js [args]')
    .options({
      port: { type: 'number', alias: 'p', default: 3000 },
      config: { type: 'string', alias: 'c' },
      rootFilePath: { type: 'string', alias: 'f' },
      sparqlEndpoint: { type: 'string', alias: 's' },
      loggingLevel: { type: 'string', alias: 'l', default: 'info' },
    })
    .help();

  (async(): Promise<string> => {
    // Load provided or default config file
    const configPath = argv.config ?
      path.join(process.cwd(), argv.config) :
      path.join(__dirname, '/../../config/config-default.json');

    // Setup from config file
    const loader = new Loader(properties);
    await loader.registerAvailableModuleResources();
    const setup: Setup = await loader
      .instantiateFromUrl('urn:solid-server:default', configPath, undefined, {
        variables: {
          'urn:solid-server:default:variable:port': argv.port,
          'urn:solid-server:default:variable:base': `http://localhost:${argv.port}/`,
          'urn:solid-server:default:variable:rootFilePath': argv.rootFilePath ?? process.cwd(),
          'urn:solid-server:default:variable:sparqlEndpoint': argv.sparqlEndpoint,
          'urn:solid-server:default:variable:loggingLevel': argv.loggingLevel,
        },
      }) as Setup;
    return await setup.setup();
  })().then((base: string): void => {
    logger.info(`Running at ${base}`);
  }).catch((error): void => {
    // This is the only time we can *not* use the logger to print error messages, as dependency injection has failed.
    stderr.write(`${error}\n`);
  });
};

/**
 * Run function for starting the server from the command line
 * @param moduleRootPath - Path to the module's root.
 */
export const runCli = function(mainModulePath: string, argv: string[]): void {
  runCustom(argv, process.stdin, process.stdout, process.stderr, { mainModulePath });
};
