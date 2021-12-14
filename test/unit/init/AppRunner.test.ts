import { ComponentsManager } from 'componentsjs';
import type { App } from '../../../src/init/App';
import { AppRunner } from '../../../src/init/AppRunner';
import type { CliExtractor } from '../../../src/init/cli/CliExtractor';
import type { VariableResolver } from '../../../src/init/variables/VariableResolver';
import { joinFilePath } from '../../../src/util/PathUtil';

const app: jest.Mocked<App> = {
  start: jest.fn(),
} as any;

const defaultParameters = {
  port: 3000,
  logLevel: 'info',
};
const extractor: jest.Mocked<CliExtractor> = {
  handleSafe: jest.fn().mockResolvedValue(defaultParameters),
} as any;

const defaultVariables = {
  'urn:solid-server:default:variable:port': 3000,
  'urn:solid-server:default:variable:loggingLevel': 'info',
};
const resolver: jest.Mocked<VariableResolver> = {
  handleSafe: jest.fn().mockResolvedValue(defaultVariables),
} as any;

const manager: jest.Mocked<ComponentsManager<App>> = {
  instantiate: jest.fn(async(iri: string): Promise<any> => {
    switch (iri) {
      case 'urn:solid-server-app-setup:default:CliResolver': return { extractor, resolver };
      case 'urn:solid-server:default:App': return app;
      default: throw new Error('unknown iri');
    }
  }),
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
const write = jest.spyOn(process.stderr, 'write').mockImplementation(jest.fn());
const exit = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as any);

describe('AppRunner', (): void => {
  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('run', (): void => {
    it('starts the server with provided settings.', async(): Promise<void> => {
      const parameters = {
        port: 3000,
        loggingLevel: 'info',
        rootFilePath: '/var/cwd/',
        showStackTrace: false,
        podConfigJson: '/var/cwd/pod-config.json',
      };
      await new AppRunner().run(
        {
          mainModulePath: joinFilePath(__dirname, '../../../'),
          dumpErrorState: true,
          logLevel: 'info',
        },
        joinFilePath(__dirname, '../../../config/default.json'),
        parameters,
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
      expect(manager.instantiate).toHaveBeenCalledTimes(2);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(extractor.handleSafe).toHaveBeenCalledTimes(0);
      expect(resolver.handleSafe).toHaveBeenCalledTimes(1);
      expect(resolver.handleSafe).toHaveBeenCalledWith(parameters);
      expect(manager.instantiate).toHaveBeenNthCalledWith(2,
        'urn:solid-server:default:App',
        { variables: defaultVariables });
      expect(app.start).toHaveBeenCalledTimes(1);
      expect(app.start).toHaveBeenCalledWith();
    });
  });

  describe('runCli', (): void => {
    it('starts the server with default settings.', async(): Promise<void> => {
      new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      // Wait until app.start has been called, because we can't await AppRunner.run.
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
      expect(manager.instantiate).toHaveBeenCalledTimes(2);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(extractor.handleSafe).toHaveBeenCalledTimes(1);
      expect(extractor.handleSafe).toHaveBeenCalledWith([ 'node', 'script' ]);
      expect(resolver.handleSafe).toHaveBeenCalledTimes(1);
      expect(resolver.handleSafe).toHaveBeenCalledWith(defaultParameters);
      expect(manager.instantiate).toHaveBeenNthCalledWith(2,
        'urn:solid-server:default:App',
        { variables: defaultVariables });
      expect(app.start).toHaveBeenCalledTimes(1);
      expect(app.start).toHaveBeenCalledWith();
    });

    it('uses the default process.argv in case none are provided.', async(): Promise<void> => {
      const { argv } = process;
      const argvParameters = [
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
      process.argv = argvParameters;

      new AppRunner().runCli();

      // Wait until app.start has been called, because we can't await AppRunner.run.
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
      expect(manager.instantiate).toHaveBeenCalledTimes(2);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(extractor.handleSafe).toHaveBeenCalledTimes(1);
      expect(extractor.handleSafe).toHaveBeenCalledWith(argvParameters);
      expect(resolver.handleSafe).toHaveBeenCalledTimes(1);
      expect(resolver.handleSafe).toHaveBeenCalledWith(defaultParameters);
      expect(manager.instantiate).toHaveBeenNthCalledWith(2,
        'urn:solid-server:default:App',
        { variables: defaultVariables });
      expect(app.start).toHaveBeenCalledTimes(1);
      expect(app.start).toHaveBeenCalledWith();

      process.argv = argv;
    });

    it('exits with output to stderr when creating a ComponentsManager fails.', async(): Promise<void> => {
      (manager.configRegistry.register as jest.Mock).mockRejectedValueOnce(new Error('Fatal'));
      new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      // Wait until app.start has been called, because we can't await AppRunner.run.
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });

      expect(write).toHaveBeenCalledTimes(2);
      expect(write).toHaveBeenNthCalledWith(1,
        expect.stringMatching(/^Could not build the config files from .*default\.json/u));
      expect(write).toHaveBeenNthCalledWith(2,
        expect.stringMatching(/^Error: Fatal/u));

      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits with output to stderr when instantiation fails.', async(): Promise<void> => {
      manager.instantiate.mockRejectedValueOnce(new Error('Fatal'));
      new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      // Wait until app.start has been called, because we can't await AppRunner.run.
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });

      expect(write).toHaveBeenCalledTimes(2);
      expect(write).toHaveBeenNthCalledWith(1,
        expect.stringMatching(/^Could not load config variables from .*default\.json/u));
      expect(write).toHaveBeenNthCalledWith(2,
        expect.stringMatching(/^Error: Fatal/u));

      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits with output to stderr when no CliExtractor is defined.', async(): Promise<void> => {
      manager.instantiate.mockResolvedValueOnce({ resolver });
      new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      // Wait until app.start has been called, because we can't await AppRunner.run.
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });

      expect(write).toHaveBeenCalledTimes(2);
      expect(write).toHaveBeenNthCalledWith(1,
        expect.stringMatching(/^Could not load config variables from .*default\.json/u));
      expect(write).toHaveBeenNthCalledWith(2,
        expect.stringMatching(/^Error: No CliExtractor is defined/u));

      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('exits without output to stderr when initialization fails.', async(): Promise<void> => {
      app.start.mockRejectedValueOnce(new Error('Fatal'));
      new AppRunner().runCli({
        argv: [ 'node', 'script' ],
      });

      // Wait until app.start has been called, because we can't await AppRunner.run.
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });

      expect(write).toHaveBeenCalledTimes(0);

      expect(exit).toHaveBeenCalledWith(1);
    });
  });
});
