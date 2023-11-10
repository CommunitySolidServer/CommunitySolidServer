import type { CliResolver } from '../../src/init/CliResolver';
import { resolveModulePath } from '../../src/util/PathUtil';
import { instantiateFromConfig } from './Config';

// Needed to prevent yargs from stopping the process on error
const error = jest.spyOn(console, 'error').mockImplementation(jest.fn());
const exit = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as any);

describe('An instantiated CliResolver', (): void => {
  let cliResolver: CliResolver;

  beforeAll(async(): Promise<void> => {
    // Create the CliExtractor
    cliResolver = await instantiateFromConfig(
      'urn:solid-server-app-setup:default:CliResolver',
      resolveModulePath('config/default.json'),
    );
  });

  it('converts known abbreviations to the full parameter.', async(): Promise<void> => {
    /* eslint-disable antfu/consistent-list-newline */
    const shorthand = await cliResolver.cliExtractor.handleSafe([ 'node', 'server.js',
      '-c', 'c',
      '-m', 'm',
      '-l', 'l',
      '-b', 'b',
      '-p', '3000',
      '-f', 'f',
      '-t',
      '-s', 's',
      '-w', '2',
    ]);
    /* eslint-enable antfu/consistent-list-newline */
    expect(shorthand.config).toEqual([ 'c' ]);
    expect(shorthand.mainModulePath).toBe('m');
    expect(shorthand.loggingLevel).toBe('l');
    expect(shorthand.baseUrl).toBe('b');
    expect(shorthand.port).toBe(3000);
    expect(shorthand.rootFilePath).toBe('f');
    expect(shorthand.showStackTrace).toBe(true);
    expect(shorthand.sparqlEndpoint).toBe('s');
    expect(shorthand.workers).toBe(2);
  });

  it('errors on unknown parameters.', async(): Promise<void> => {
    await cliResolver.cliExtractor.handleSafe([ 'node', 'server.js', '-a', 'abc' ]);

    expect(exit).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('Unknown argument: a');
  });
});
