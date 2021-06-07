import { ComponentsManager } from 'componentsjs';
import { AppRunner } from '../../../src/init/AppRunner';
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
        'urn:solid-server:default:Initializer',
        {
          variables: {
            'urn:solid-server:default:variable:port': 3000,
            'urn:solid-server:default:variable:baseUrl': 'http://localhost:3000/',
            'urn:solid-server:default:variable:rootFilePath': '/var/cwd/',
            'urn:solid-server:default:variable:sparqlEndpoint': undefined,
            'urn:solid-server:default:variable:loggingLevel': 'info',
            'urn:solid-server:default:variable:showStackTrace': false,
            'urn:solid-server:default:variable:podConfigJson': '/var/cwd/pod-config.json',
            'urn:solid-server:default:variable:idpTemplateFolder': joinFilePath(__dirname, '../../../templates/idp'),
          },
        },
      );
      expect(initializer.handleSafe).toHaveBeenCalledTimes(1);
      expect(initializer.handleSafe).toHaveBeenCalledWith();
    });
  });

  describe('runCli', (): void => {
    it('starts the server with default settings.', async(): Promise<void> => {
      new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      // Wait until initializer has been called, because we can't await AppRunner.run.
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
        .toHaveBeenCalledWith(joinFilePath(__dirname, '/../../../config/default.json'));
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
            'urn:solid-server:default:variable:showStackTrace': false,
            'urn:solid-server:default:variable:podConfigJson': '/var/cwd/pod-config.json',
            'urn:solid-server:default:variable:idpTemplateFolder': joinFilePath(__dirname, '../../../templates/idp'),
          },
        },
      );
      expect(initializer.handleSafe).toHaveBeenCalledTimes(1);
      expect(initializer.handleSafe).toHaveBeenCalledWith();
    });

    it('accepts abbreviated flags.', async(): Promise<void> => {
      new AppRunner().runCli({
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
          '--idpTemplateFolder', 'templates/idp',
        ],
      });

      // Wait until initializer has been called, because we can't await AppRunner.run.
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
      expect(manager.configRegistry.register).toHaveBeenCalledWith('/var/cwd/myconfig.json');
      expect(manager.instantiate).toHaveBeenCalledWith(
        'urn:solid-server:default:Initializer',
        {
          variables: {
            'urn:solid-server:default:variable:baseUrl': 'http://pod.example/',
            'urn:solid-server:default:variable:loggingLevel': 'debug',
            'urn:solid-server:default:variable:port': 4000,
            'urn:solid-server:default:variable:rootFilePath': '/root',
            'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:5000/sparql',
            'urn:solid-server:default:variable:showStackTrace': true,
            'urn:solid-server:default:variable:podConfigJson': '/different-path.json',
            'urn:solid-server:default:variable:idpTemplateFolder': '/var/cwd/templates/idp',
          },
        },
      );
    });

    it('accepts full flags.', async(): Promise<void> => {
      new AppRunner().runCli({
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
          '--idpTemplateFolder', 'templates/idp',
        ],
      });

      // Wait until initializer has been called, because we can't await AppRunner.run.
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
      expect(manager.configRegistry.register).toHaveBeenCalledWith('/var/cwd/myconfig.json');
      expect(manager.instantiate).toHaveBeenCalledWith(
        'urn:solid-server:default:Initializer',
        {
          variables: {
            'urn:solid-server:default:variable:baseUrl': 'http://pod.example/',
            'urn:solid-server:default:variable:loggingLevel': 'debug',
            'urn:solid-server:default:variable:port': 4000,
            'urn:solid-server:default:variable:rootFilePath': '/var/cwd/root',
            'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:5000/sparql',
            'urn:solid-server:default:variable:showStackTrace': true,
            'urn:solid-server:default:variable:podConfigJson': '/different-path.json',
            'urn:solid-server:default:variable:idpTemplateFolder': '/var/cwd/templates/idp',
          },
        },
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
        '--idpTemplateFolder', 'templates/idp',
      ];

      new AppRunner().runCli();

      // Wait until initializer has been called, because we can't await AppRunner.run.
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
      expect(manager.configRegistry.register).toHaveBeenCalledWith('/var/cwd/myconfig.json');
      expect(manager.instantiate).toHaveBeenCalledWith(
        'urn:solid-server:default:Initializer',
        {
          variables: {
            'urn:solid-server:default:variable:baseUrl': 'http://pod.example/',
            'urn:solid-server:default:variable:loggingLevel': 'debug',
            'urn:solid-server:default:variable:port': 4000,
            'urn:solid-server:default:variable:rootFilePath': '/root',
            'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:5000/sparql',
            'urn:solid-server:default:variable:showStackTrace': true,
            'urn:solid-server:default:variable:podConfigJson': '/different-path.json',
            'urn:solid-server:default:variable:idpTemplateFolder': '/var/cwd/templates/idp',
          },
        },
      );

      process.argv = argv;
    });

    it('exits with output to stderr when instantiation fails.', async(): Promise<void> => {
      manager.instantiate.mockRejectedValueOnce(new Error('Fatal'));
      new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      // Wait until initializer has been called, because we can't await AppRunner.run.
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });

      expect(write).toHaveBeenCalledTimes(2);
      expect(write).toHaveBeenNthCalledWith(1,
        expect.stringMatching(/^Error: could not instantiate server from .*default\.json/u));
      expect(write).toHaveBeenNthCalledWith(2,
        expect.stringMatching(/^Error: Fatal/u));

      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits without output to stderr when initialization fails.', async(): Promise<void> => {
      initializer.handleSafe.mockRejectedValueOnce(new Error('Fatal'));
      new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      // Wait until initializer has been called, because we can't await AppRunner.run.
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });

      expect(write).toHaveBeenCalledTimes(0);

      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits when unknown options are passed to the main executable.', async(): Promise<void> => {
      new AppRunner().runCli({
        argv: [ 'node', 'script', '--foo' ],
      });

      // Wait until initializer has been called, because we can't await AppRunner.run.
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });

      expect(error).toHaveBeenCalledWith('Unknown argument: foo');
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits when no value is passed to the main executable for an argument.', async(): Promise<void> => {
      new AppRunner().runCli({
        argv: [ 'node', 'script', '-s' ],
      });

      // Wait until initializer has been called, because we can't await AppRunner.run.
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });

      expect(error).toHaveBeenCalledWith('Not enough arguments following: s');
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits when unknown parameters are passed to the main executable.', async(): Promise<void> => {
      new AppRunner().runCli({
        argv: [ 'node', 'script', 'foo', 'bar', 'foo.txt', 'bar.txt' ],
      });

      // Wait until initializer has been called, because we can't await AppRunner.run.
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });

      expect(error).toHaveBeenCalledWith('Unsupported positional arguments: "foo", "bar", "foo.txt", "bar.txt"');
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits when multiple values for a parameter are passed.', async(): Promise<void> => {
      new AppRunner().runCli({
        argv: [ 'node', 'script', '-l', 'info', '-l', 'debug' ],
      });

      // Wait until initializer has been called, because we can't await AppRunner.run.
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });

      expect(error).toHaveBeenCalledWith('Multiple values were provided for: "l": "info", "debug"');
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });
  });
});
