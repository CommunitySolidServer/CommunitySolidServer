import { ComponentsManager } from 'componentsjs';
import { CliRunner } from '../../../src/init/CliRunner';
import type { Initializer } from '../../../src/init/Initializer';
import { joinFilePath } from '../../../src/util/PathUtil';

const initializer: jest.Mocked<Initializer> = {
  handleSafe: jest.fn(),
} as any;

const manager: jest.Mocked<ComponentsManager<Initializer>> = {
  instantiate: jest.fn(async(): Promise<Initializer> => initializer),
  configRegistry: {
    register: jest.fn(),
  },
} as any;

jest.mock('componentsjs', (): any => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ComponentsManager: {
    build: jest.fn(async(): Promise<ComponentsManager<Initializer>> => manager),
  },
}));

jest.spyOn(process, 'cwd').mockReturnValue('/var/cwd');
const write = jest.spyOn(process.stderr, 'write').mockImplementation(jest.fn());
const exit = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as any);

describe('CliRunner', (): void => {
  afterEach((): void => {
    jest.clearAllMocks();
  });

  it('starts the server with default settings.', async(): Promise<void> => {
    new CliRunner().run({
      argv: [ 'node', 'script' ],
    });

    // Wait until initializer has been called, because we can't await CliRunner.run.
    await new Promise((resolve): void => {
      setImmediate(resolve);
    });

    expect(ComponentsManager.build).toHaveBeenCalledTimes(1);
    expect(ComponentsManager.build).toHaveBeenCalledWith({
      dumpErrorState: true,
      logLevel: 'info',
      mainModulePath: joinFilePath(__dirname, '../../../'),
    });
    expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
    expect(manager.configRegistry.register)
      .toHaveBeenCalledWith(joinFilePath(__dirname, '/../../../config/config-default.json'));
    expect(manager.instantiate).toHaveBeenCalledTimes(1);
    expect(manager.instantiate).toHaveBeenCalledWith(
      'urn:solid-server:default:Initializer',
      {
        variables: {
          'urn:solid-server:default:variable:port': 3000,
          'urn:solid-server:default:variable:baseUrl': 'http://localhost:3000/',
          'urn:solid-server:default:variable:rootFilePath': '/var/cwd/',
          'urn:solid-server:default:variable:sparqlEndpoint': undefined,
          'urn:solid-server:default:variable:loggingLevel': 'info',
          'urn:solid-server:default:variable:podTemplateFolder': joinFilePath(__dirname, '../../../templates/pod'),
        },
      },
    );
    expect(initializer.handleSafe).toHaveBeenCalledTimes(1);
    expect(initializer.handleSafe).toHaveBeenCalledWith();
  });

  it('accepts abbreviated flags.', async(): Promise<void> => {
    new CliRunner().run({
      argv: [
        'node', 'script',
        '-b', 'http://pod.example/',
        '-c', 'myconfig.json',
        '-f', '/root',
        '-l', 'debug',
        '-m', 'module/path',
        '-p', '4000',
        '-s', 'http://localhost:5000/sparql',
        '-t', 'templates',
      ],
    });

    // Wait until initializer has been called, because we can't await CliRunner.run.
    await new Promise((resolve): void => {
      setImmediate(resolve);
    });

    expect(ComponentsManager.build).toHaveBeenCalledTimes(1);
    expect(ComponentsManager.build).toHaveBeenCalledWith({
      dumpErrorState: true,
      logLevel: 'debug',
      mainModulePath: '/var/cwd/module/path',
    });
    expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
    expect(manager.configRegistry.register)
      .toHaveBeenCalledWith('/var/cwd/myconfig.json');
    expect(manager.instantiate).toHaveBeenCalledWith(
      'urn:solid-server:default:Initializer',
      {
        variables: {
          'urn:solid-server:default:variable:baseUrl': 'http://pod.example/',
          'urn:solid-server:default:variable:loggingLevel': 'debug',
          'urn:solid-server:default:variable:podTemplateFolder': '/var/cwd/templates',
          'urn:solid-server:default:variable:port': 4000,
          'urn:solid-server:default:variable:rootFilePath': '/var/cwd/root',
          'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:5000/sparql',
        },
      },
    );
  });

  it('accepts full flags.', async(): Promise<void> => {
    new CliRunner().run({
      argv: [
        'node', 'script',
        '--baseUrl', 'http://pod.example/',
        '--config', 'myconfig.json',
        '--loggingLevel', 'debug',
        '--mainModulePath', 'module/path',
        '--podTemplateFolder', 'templates',
        '--port', '4000',
        '--rootFilePath', 'root',
        '--sparqlEndpoint', 'http://localhost:5000/sparql',
      ],
    });

    // Wait until initializer has been called, because we can't await CliRunner.run.
    await new Promise((resolve): void => {
      setImmediate(resolve);
    });

    expect(ComponentsManager.build).toHaveBeenCalledTimes(1);
    expect(ComponentsManager.build).toHaveBeenCalledWith({
      dumpErrorState: true,
      logLevel: 'debug',
      mainModulePath: '/var/cwd/module/path',
    });
    expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
    expect(manager.configRegistry.register)
      .toHaveBeenCalledWith('/var/cwd/myconfig.json');
    expect(manager.instantiate).toHaveBeenCalledWith(
      'urn:solid-server:default:Initializer',
      {
        variables: {
          'urn:solid-server:default:variable:baseUrl': 'http://pod.example/',
          'urn:solid-server:default:variable:loggingLevel': 'debug',
          'urn:solid-server:default:variable:podTemplateFolder': '/var/cwd/templates',
          'urn:solid-server:default:variable:port': 4000,
          'urn:solid-server:default:variable:rootFilePath': '/var/cwd/root',
          'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:5000/sparql',
        },
      },
    );
  });

  it('exits with output to stderr when instantiation fails.', async(): Promise<void> => {
    manager.instantiate.mockRejectedValueOnce(new Error('Fatal'));
    new CliRunner().run({
      argv: [ 'node', 'script' ],
    });
    await new Promise((resolve): any => setImmediate(resolve));

    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenNthCalledWith(1,
      expect.stringMatching(/^Error: could not instantiate server from .*config-default\.json/u));
    expect(write).toHaveBeenNthCalledWith(2,
      expect.stringMatching(/^Error: Fatal/u));

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits without output to stderr when initialization fails.', async(): Promise<void> => {
    initializer.handleSafe.mockRejectedValueOnce(new Error('Fatal'));
    new CliRunner().run();
    await new Promise((resolve): any => setImmediate(resolve));

    expect(write).toHaveBeenCalledTimes(0);

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
