import * as Path from 'path';
import { ReadStream, WriteStream } from 'tty';
import { Loader, LoaderProperties } from 'componentsjs';
import yargs from 'yargs';
import { Setup } from './Setup';

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
  const { argv } = yargs
    .usage('node ./bin/server.js [args]')
    .options({
      port: { type: 'number', alias: 'p', default: 3000 },
      config: { type: 'string', alias: 'c' },
    })
    .help();

  (async(): Promise<string> => {
    // Load provided or default config file
    const configPath = argv.config ?
      Path.join(process.cwd(), argv.config) :
      `${__dirname}/../../config/config-default.json`;

    // Setup from config file
    const loader = new Loader(properties);
    await loader.registerAvailableModuleResources();
    const setup: Setup = await loader
      .instantiateFromUrl('urn:solid-server:default', configPath, undefined, {
        variables: {
          'urn:solid-server:default:variable:port': argv.port,
          'urn:solid-server:default:variable:base': `http://localhost:${argv.port}/`,
          'urn:solid-server:default:variable:rootFilePath': process.cwd(),
        },
      });
    return await setup.setup();
  })().then((base: string): void => {
    stdout.write(`Running at ${base}\n`);
  }).catch((error): void => {
    stderr.write(`${error}\n`);
  });
};

/**
 * Run function for starting the server from the command line
 * @param moduleRootPath - Path to the module's root.
 */
export const runCli = function(moduleRootPath: string): void {
  const argv = process.argv.slice(2);
  runCustom(argv, process.stdin, process.stdout, process.stderr, { mainModulePath: moduleRootPath });
};
