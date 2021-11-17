import { ComponentsManager } from 'componentsjs';
import type { App } from '../../../src/init/App';
import { AppRunner } from '../../../src/init/AppRunner';
import { joinFilePath } from '../../../src/util/PathUtil';

const app: jest.Mocked<App> = {
  start: jest.fn(),
} as any;

const manager: jest.Mocked<ComponentsManager<App>> = {
  instantiate: jest.fn(async(): Promise<App> => app),
  configRegistry: {
    register: jest.fn(),
  },
} as any;

jest.mock('componentsjs', (): any => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ComponentsManager: {
    build: jest.fn(async(): Promise<ComponentsManager<App>> => manager),
  },
}));

jest.spyOn(process, 'cwd').mockReturnValue('/var/cwd');
const error = jest.spyOn(console, 'error').mockImplementation(jest.fn());
const write = jest.spyOn(process.stderr, 'write').mockImplementation(jest.fn());
const exit = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as any);

describe('AppRunner', (): void => {
  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('run', (): void => {
    it('starts the server with default settings.', async(): Promise<void> => {
      await new AppRunner().run(
        {
          mainModulePath: joinFilePath(__dirname, '../../../'),
          dumpErrorState: true,
          logLevel: 'info',
        },
        joinFilePath(__dirname, '../../../config/default.json'),
        {
          port: 3000,
          loggingLevel: 'info',
          rootFilePath: '/var/cwd/',
          showStackTrace: false,
          podConfigJson: '/var/cwd/pod-config.json',
        },
      );

      expect(ComponentsManager.build).toHaveBeenCalledTimes(1);
      expect(ComponentsManager.build).toHaveBeenCalledWith({
        dumpErrorState: true,
        logLevel: 'info',
        mainModulePath: joinFilePath(__dirname, '../../../'),
      });
      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register)
        .toHaveBeenCalledWith(joinFilePath(__dirname, '/../../../config/default.json'));
      expect(manager.instantiate).toHaveBeenCalledTimes(1);
      expect(manager.instantiate).toHaveBeenCalledWith(
        'urn:solid-server:default:App',
        {
          variables: {
            'urn:solid-server:default:variable:port': 3000,
            'urn:solid-server:default:variable:baseUrl': 'http://localhost:3000/',
            'urn:solid-server:default:variable:rootFilePath': '/var/cwd/',
            'urn:solid-server:default:variable:sparqlEndpoint': undefined,
            'urn:solid-server:default:variable:loggingLevel': 'info',
            'urn:solid-server:default:variable:showStackTrace': false,
            'urn:solid-server:default:variable:podConfigJson': '/var/cwd/pod-config.json',
          },
        },
      );
      expect(app.start).toHaveBeenCalledTimes(1);
      expect(app.start).toHaveBeenCalledWith();
    });
  });

  describe('runCli', (): void => {
    it('starts the server with default settings.', async(): Promise<void> => {
      await new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      expect(ComponentsManager.build).toHaveBeenCalledTimes((1));
      expect(ComponentsManager.build).toHaveBeenCalledWith({
        dumpErrorState: true,
        logLevel: 'info',
        mainModulePath: joinFilePath(__dirname, '../../../'),
      });
      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register)
        .toHaveBeenCalledWith(joinFilePath(__dirname, '/../../../config/default.json'));
      expect(manager.instantiate).toHaveBeenCalledTimes(1);
      expect(manager.instantiate).toHaveBeenCalledWith(
        'urn:solid-server:default:App',
        {
          variables: {
            'urn:solid-server:default:variable:port': 3000,
            'urn:solid-server:default:variable:baseUrl': 'http://localhost:3000/',
            'urn:solid-server:default:variable:rootFilePath': '/var/cwd/',
            'urn:solid-server:default:variable:sparqlEndpoint': undefined,
            'urn:solid-server:default:variable:loggingLevel': 'info',
            'urn:solid-server:default:variable:showStackTrace': false,
            'urn:solid-server:default:variable:podConfigJson': '/var/cwd/pod-config.json',
          },
        },
      );
      expect(app.start).toHaveBeenCalledTimes(1);
      expect(app.start).toHaveBeenCalledWith();
    });

    it('accepts abbreviated flags.', async(): Promise<void> => {
      await new AppRunner().runCli({
        argv: [
          'node', 'script',
          '-b', 'http://pod.example/',
          '-c', 'myconfig.json',
          '-f', '/root',
          '-l', 'debug',
          '-m', 'module/path',
          '-p', '4000',
          '-s', 'http://localhost:5000/sparql',
          '-t',
          '--podConfigJson', '/different-path.json',
        ],
      });

      expect(ComponentsManager.build).toHaveBeenCalledTimes((1));
      expect(ComponentsManager.build).toHaveBeenCalledWith({
        dumpErrorState: true,
        logLevel: 'debug',
        mainModulePath: '/var/cwd/module/path',
      });
      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register).toHaveBeenCalledWith('/var/cwd/myconfig.json');
      expect(manager.instantiate).toHaveBeenCalledWith(
        'urn:solid-server:default:App',
        {
          variables: {
            'urn:solid-server:default:variable:baseUrl': 'http://pod.example/',
            'urn:solid-server:default:variable:loggingLevel': 'debug',
            'urn:solid-server:default:variable:port': 4000,
            'urn:solid-server:default:variable:rootFilePath': '/root',
            'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:5000/sparql',
            'urn:solid-server:default:variable:showStackTrace': true,
            'urn:solid-server:default:variable:podConfigJson': '/different-path.json',
          },
        },
      );
    });

    it('accepts full flags.', async(): Promise<void> => {
      await new AppRunner().runCli({
        argv: [
          'node', 'script',
          '--baseUrl', 'http://pod.example/',
          '--config', 'myconfig.json',
          '--loggingLevel', 'debug',
          '--mainModulePath', 'module/path',
          '--port', '4000',
          '--rootFilePath', 'root',
          '--sparqlEndpoint', 'http://localhost:5000/sparql',
          '--showStackTrace',
          '--podConfigJson', '/different-path.json',
        ],
      });

      expect(ComponentsManager.build).toHaveBeenCalledTimes((1));
      expect(ComponentsManager.build).toHaveBeenCalledWith({
        dumpErrorState: true,
        logLevel: 'debug',
        mainModulePath: '/var/cwd/module/path',
      });
      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register).toHaveBeenCalledWith('/var/cwd/myconfig.json');
      expect(manager.instantiate).toHaveBeenCalledWith(
        'urn:solid-server:default:App',
        {
          variables: {
            'urn:solid-server:default:variable:baseUrl': 'http://pod.example/',
            'urn:solid-server:default:variable:loggingLevel': 'debug',
            'urn:solid-server:default:variable:port': 4000,
            'urn:solid-server:default:variable:rootFilePath': '/var/cwd/root',
            'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:5000/sparql',
            'urn:solid-server:default:variable:showStackTrace': true,
            'urn:solid-server:default:variable:podConfigJson': '/different-path.json',
          },
        },
      );
    });

    it('accepts asset paths for the config flag.', async(): Promise<void> => {
      await new AppRunner().runCli({
        argv: [
          'node', 'script',
          '--config', '@css:config/file.json',
        ],
      });

      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register).toHaveBeenCalledWith(
        joinFilePath(__dirname, '../../../config/file.json'),
      );
    });

    it('uses the default process.argv in case none are provided.', async(): Promise<void> => {
      const { argv } = process;
      process.argv = [
        'node', 'script',
        '-b', 'http://pod.example/',
        '-c', 'myconfig.json',
        '-f', '/root',
        '-l', 'debug',
        '-m', 'module/path',
        '-p', '4000',
        '-s', 'http://localhost:5000/sparql',
        '-t',
        '--podConfigJson', '/different-path.json',
      ];

      await new AppRunner().runCli();

      expect(ComponentsManager.build).toHaveBeenCalledTimes((1));
      expect(ComponentsManager.build).toHaveBeenCalledWith({
        dumpErrorState: true,
        logLevel: 'debug',
        mainModulePath: '/var/cwd/module/path',
      });
      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register).toHaveBeenCalledWith('/var/cwd/myconfig.json');
      expect(manager.instantiate).toHaveBeenCalledWith(
        'urn:solid-server:default:App',
        {
          variables: {
            'urn:solid-server:default:variable:baseUrl': 'http://pod.example/',
            'urn:solid-server:default:variable:loggingLevel': 'debug',
            'urn:solid-server:default:variable:port': 4000,
            'urn:solid-server:default:variable:rootFilePath': '/root',
            'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:5000/sparql',
            'urn:solid-server:default:variable:showStackTrace': true,
            'urn:solid-server:default:variable:podConfigJson': '/different-path.json',
          },
        },
      );

      process.argv = argv;
    });

    it('exits with output to stderr when instantiation fails.', async(): Promise<void> => {
      manager.instantiate.mockRejectedValueOnce(new Error('Fatal'));
      await new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      expect(write).toHaveBeenCalledTimes((1));
      expect(write).toHaveBeenNthCalledWith(1,
        expect.stringMatching(/^Error: could not instantiate server from .*default\.json/u));
      expect(write).toHaveBeenNthCalledWith((1),
        expect.stringMatching(/^Error: Fatal/u));

      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits without output to stderr when initialization fails.', async(): Promise<void> => {
      app.start.mockRejectedValueOnce(new Error('Fatal'));
      await new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      expect(write).toHaveBeenCalledTimes(0);

      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits when unknown options are passed to the main executable.', async(): Promise<void> => {
      await new AppRunner().runCli({
        argv: [ 'node', 'script', '--foo' ],
      });

      expect(error).toHaveBeenCalledWith('Unknown argument: foo');
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits when no value is passed to the main executable for an argument.', async(): Promise<void> => {
      await new AppRunner().runCli({
        argv: [ 'node', 'script', '-s' ],
      });

      expect(error).toHaveBeenCalledWith('Not enough arguments following: s');
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits when unknown parameters are passed to the main executable.', async(): Promise<void> => {
      await new AppRunner().runCli({
        argv: [ 'node', 'script', 'foo', 'bar', 'foo.txt', 'bar.txt' ],
      });

      expect(error).toHaveBeenCalledWith('Unsupported positional arguments: "foo", "bar", "foo.txt", "bar.txt"');
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits when multiple values for a parameter are passed.', async(): Promise<void> => {
      await new AppRunner().runCli({
        argv: [ 'node', 'script', '-l', 'info', '-l', 'debug' ],
      });

      expect(error).toHaveBeenCalledWith('Multiple values were provided for: "l": "info", "debug"');
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });
  });
});
