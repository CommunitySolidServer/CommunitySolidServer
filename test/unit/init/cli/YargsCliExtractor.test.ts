import { YargsCliExtractor, YargsParameter } from '../../../../src/init/cli/YargsCliExtractor';

const error = jest.spyOn(console, 'error').mockImplementation(jest.fn());
const log = jest.spyOn(console, 'log').mockImplementation(jest.fn());
const exit = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as any);

describe('A YargsCliExtractor', (): void => {
  const parameters: YargsParameter[] = [
    new YargsParameter('baseUrl', { alias: 'b', requiresArg: true, type: 'string' }),
    new YargsParameter('port', { alias: 'p', requiresArg: true, type: 'number' }),
    new YargsParameter('config', { alias: 'c', requiresArg: false, type: 'array' }),
  ];
  let extractor: YargsCliExtractor;

  beforeEach(async(): Promise<void> => {
    extractor = new YargsCliExtractor(parameters, {});
  });

  afterEach(async(): Promise<void> => {
    jest.clearAllMocks();
  });

  it('returns parsed results.', async(): Promise<void> => {
    const argv = [ 'node', 'script', '-b', 'http://localhost:3000/', '-p', '3000' ];
    await expect(extractor.handle(argv)).resolves.toEqual(expect.objectContaining({
      baseUrl: 'http://localhost:3000/',
      port: 3000,
    }));
  });

  it('accepts full flags.', async(): Promise<void> => {
    const argv = [ 'node', 'script', '--baseUrl', 'http://localhost:3000/', '--port', '3000' ];
    await expect(extractor.handle(argv)).resolves.toEqual(expect.objectContaining({
      baseUrl: 'http://localhost:3000/',
      port: 3000,
    }));
  });

  it('prints usage if defined.', async(): Promise<void> => {
    extractor = new YargsCliExtractor(parameters, { usage: 'node ./bin/server.js [args]' });
    const argv = [ 'node', 'script', '--help' ];
    await extractor.handle(argv);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenLastCalledWith(expect.stringMatching(/^node \.\/bin\/server\.js \[args\]/u));
  });

  it('can error on undefined parameters.', async(): Promise<void> => {
    extractor = new YargsCliExtractor(parameters, { strictMode: true });
    const argv = [ 'node', 'script', '--unsupported' ];
    await extractor.handle(argv);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('Unknown argument: unsupported');
  });

  it('can error when multiple values are provided for a non array type parameter.', async(): Promise<void> => {
    extractor = new YargsCliExtractor(parameters, { strictMode: true });
    const argv = [ 'node', 'script', '-p', '3000', '-b', 'http://localhost:3000/', '-p', '3001' ];
    await extractor.handle(argv);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('Multiple values for --port (-p) were provided where only one is allowed');
  });

  it('accepts multiple values for array type parameters.', async(): Promise<void> => {
    const argv = [ 'node', 'script', '-c', './config/a.json', '-c', './config/b.json', '-b', 'http://localhost:3000/', '-p', '3000' ];
    await expect(extractor.handle(argv)).resolves.toEqual(expect.objectContaining({
      config: [ './config/a.json', './config/b.json' ],
    }));
  });

  it('can parse environment variables.', async(): Promise<void> => {
    // While the code below does go into the corresponding values,
    // yargs does not see the new environment variable for some reason.
    // It does see all the env variables that were already in there
    // (which can be tested by setting envVarPrefix to '').
    // This can probably be fixed by changing jest setup to already load the custom env before loading the tests,
    // but does not seem worth it just for this test.
    const { env } = process;
    process.env = { ...env, TEST_ENV_PORT: '3333' };
    extractor = new YargsCliExtractor(parameters, { loadFromEnv: true, envVarPrefix: 'TEST_ENV' });
    const argv = [ 'node', 'script', '-b', 'http://localhost:3333/' ];
    await expect(extractor.handle(argv)).resolves.toEqual(expect.objectContaining({
      baseUrl: 'http://localhost:3333/',
    }));
    process.env = env;

    // This part is here for the case of envVarPrefix being defined
    // since it doesn't make much sense to test it if the above doesn't work
    extractor = new YargsCliExtractor(parameters, { loadFromEnv: true });
    await extractor.handle(argv);
  });
});
