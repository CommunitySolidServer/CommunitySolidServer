import { ComponentsManager } from 'componentsjs';
import type { ClusterManager } from '../../../src';
import type { App } from '../../../src/init/App';
import { AppRunner } from '../../../src/init/AppRunner';
import type { CliExtractor } from '../../../src/init/cli/CliExtractor';
import type { ShorthandResolver } from '../../../src/init/variables/ShorthandResolver';
import { joinFilePath } from '../../../src/util/PathUtil';
import { flushPromises } from '../../util/Util';

const defaultParameters = {
  port: 3000,
  logLevel: 'info',
};
const cliExtractor: jest.Mocked<CliExtractor> = {
  handleSafe: jest.fn().mockResolvedValue(defaultParameters),
} as any;

const defaultVariables = {
  'urn:solid-server:default:variable:port': 3000,
  'urn:solid-server:default:variable:loggingLevel': 'info',
};
const shorthandResolver: jest.Mocked<ShorthandResolver> = {
  handleSafe: jest.fn().mockResolvedValue(defaultVariables),
} as any;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  silly: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

const clusterManager: jest.Mocked<ClusterManager> = {
  isSingleThreaded: jest.fn().mockReturnValue(false),
  spawnWorkers: jest.fn(),
  isPrimary: jest.fn().mockReturnValue(true),
  isWorker: jest.fn().mockReturnValue(false),
  logger: mockLogger,
  workers: 1,
  clusterMode: 1,
} as any;

const app: jest.Mocked<App> = {
  start: jest.fn(),
  clusterManager,
} as any;

const manager: jest.Mocked<ComponentsManager<App>> = {
  instantiate: jest.fn(async(iri: string): Promise<any> => {
    switch (iri) {
      case 'urn:solid-server-app-setup:default:CliResolver': return { cliExtractor, shorthandResolver };
      case 'urn:solid-server:default:App': return app;
      default: throw new Error('unknown iri');
    }
  }),
  configRegistry: {
    register: jest.fn(),
  },
} as any;

const listSingleThreadedComponentsMock = jest.fn().mockResolvedValue([]);

jest.mock('../../../src/init/cluster/SingleThreaded', (): any => ({
  listSingleThreadedComponents: (): any => listSingleThreadedComponentsMock(),
}));

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

  describe('create', (): void => {
    it('creates an App with the provided settings.', async(): Promise<void> => {
      const variables = {
        'urn:solid-server:default:variable:port': 4000,
        'urn:solid-server:default:variable:rootFilePath': '/var/cwd/',
        'urn:solid-server:default:variable:showStackTrace': false,
        'urn:solid-server:default:variable:podConfigJson': '/var/cwd/pod-config.json',
        'urn:solid-server:default:variable:seededPodConfigJson': '/var/cwd/seeded-pod-config.json',
      };
      const shorthand = {
        logLevel: 'info',
      };
      const expectedVariables = {
        ...variables,
        'urn:solid-server:default:variable:loggingLevel': 'info',
      };

      const createdApp = await new AppRunner().create(
        {
          mainModulePath: joinFilePath(__dirname, '../../../'),
          dumpErrorState: true,
          logLevel: 'info',
        },
        joinFilePath(__dirname, '../../../config/default.json'),
        variables,
        shorthand,
      );
      expect(createdApp).toBe(app);

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
      expect(manager.instantiate).toHaveBeenNthCalledWith(
        2, 'urn:solid-server:default:App', { variables: expectedVariables },
      );
      expect(shorthandResolver.handleSafe).toHaveBeenCalledTimes(1);
      expect(shorthandResolver.handleSafe).toHaveBeenLastCalledWith(shorthand);
      expect(cliExtractor.handleSafe).toHaveBeenCalledTimes(0);
      expect(app.start).toHaveBeenCalledTimes(0);
      expect(app.clusterManager.isSingleThreaded()).toBeFalsy();
    });

    it('throws an error if threading issues are detected with 1 class.', async(): Promise<void> => {
      listSingleThreadedComponentsMock.mockImplementationOnce((): string[] => [ 'ViolatingClass' ]);
      const variables = {
        'urn:solid-server:default:variable:port': 3000,
        'urn:solid-server:default:variable:loggingLevel': 'info',
        'urn:solid-server:default:variable:rootFilePath': '/var/cwd/',
        'urn:solid-server:default:variable:showStackTrace': false,
        'urn:solid-server:default:variable:podConfigJson': '/var/cwd/pod-config.json',
        'urn:solid-server:default:variable:seededPodConfigJson': '/var/cwd/seeded-pod-config.json',
      };

      let caughtError: Error | undefined;
      try {
        await new AppRunner().create(
          {
            mainModulePath: joinFilePath(__dirname, '../../../'),
            dumpErrorState: true,
            logLevel: 'info',
          },
          joinFilePath(__dirname, '../../../config/default.json'),
          variables,
        );
      } catch (error: unknown) {
        caughtError = error as Error;
      }
      expect(caughtError?.message).toMatch(/^Cannot run a singlethreaded-only component in a multithreaded setup!/mu);
      expect(caughtError?.message).toMatch(
        /\[ViolatingClass\] is not threadsafe and should not be run in multithreaded setups!/mu,
      );

      expect(write).toHaveBeenCalledTimes(0);
      expect(exit).toHaveBeenCalledTimes(0);
    });

    it('throws an error if threading issues are detected with 2 class.', async(): Promise<void> => {
      listSingleThreadedComponentsMock.mockImplementationOnce((): string[] => [ 'ViolatingClass1', 'ViolatingClass2' ]);
      const variables = {
        'urn:solid-server:default:variable:port': 3000,
        'urn:solid-server:default:variable:loggingLevel': 'info',
        'urn:solid-server:default:variable:rootFilePath': '/var/cwd/',
        'urn:solid-server:default:variable:showStackTrace': false,
        'urn:solid-server:default:variable:podConfigJson': '/var/cwd/pod-config.json',
        'urn:solid-server:default:variable:seededPodConfigJson': '/var/cwd/seeded-pod-config.json',
      };

      let caughtError: Error | undefined;
      try {
        await new AppRunner().create(
          {
            mainModulePath: joinFilePath(__dirname, '../../../'),
            dumpErrorState: true,
            logLevel: 'info',
          },
          joinFilePath(__dirname, '../../../config/default.json'),
          variables,
        );
      } catch (error: unknown) {
        caughtError = error as Error;
      }
      expect(caughtError?.message).toMatch(/^Cannot run a singlethreaded-only component in a multithreaded setup!/mu);
      expect(caughtError?.message).toMatch(
        /\[ViolatingClass1, ViolatingClass2\] are not threadsafe and should not be run in multithreaded setups!/mu,
      );

      expect(write).toHaveBeenCalledTimes(0);
      expect(exit).toHaveBeenCalledTimes(0);
    });
  });

  describe('run', (): void => {
    it('starts the server with provided settings.', async(): Promise<void> => {
      const variables = {
        'urn:solid-server:default:variable:port': 4000,
        'urn:solid-server:default:variable:rootFilePath': '/var/cwd/',
        'urn:solid-server:default:variable:showStackTrace': false,
        'urn:solid-server:default:variable:podConfigJson': '/var/cwd/pod-config.json',
        'urn:solid-server:default:variable:seededPodConfigJson': '/var/cwd/seeded-pod-config.json',
      };
      const shorthand = {
        logLevel: 'info',
      };
      const expectedVariables = {
        ...variables,
        'urn:solid-server:default:variable:loggingLevel': 'info',
      };

      await new AppRunner().run(
        {
          mainModulePath: joinFilePath(__dirname, '../../../'),
          dumpErrorState: true,
          logLevel: 'info',
        },
        joinFilePath(__dirname, '../../../config/default.json'),
        variables,
        shorthand,
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
      expect(manager.instantiate).toHaveBeenNthCalledWith(
        2, 'urn:solid-server:default:App', { variables: expectedVariables },
      );
      expect(shorthandResolver.handleSafe).toHaveBeenCalledTimes(1);
      expect(shorthandResolver.handleSafe).toHaveBeenLastCalledWith(shorthand);
      expect(cliExtractor.handleSafe).toHaveBeenCalledTimes(0);
      expect(app.start).toHaveBeenCalledTimes(1);
      expect(app.start).toHaveBeenCalledWith();
      expect(app.clusterManager.isSingleThreaded()).toBeFalsy();
    });
  });

  describe('createCli', (): void => {
    it('creates the server with default settings.', async(): Promise<void> => {
      await expect(new AppRunner().createCli([ 'node', 'script' ])).resolves.toBe(app);

      expect(ComponentsManager.build).toHaveBeenCalledTimes(1);
      expect(ComponentsManager.build).toHaveBeenCalledWith({
        dumpErrorState: true,
        logLevel: 'info',
        mainModulePath: joinFilePath(__dirname, '../../../'),
        typeChecking: false,
      });
      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register)
        .toHaveBeenCalledWith(joinFilePath(__dirname, '/../../../config/default.json'));
      expect(manager.instantiate).toHaveBeenCalledTimes(2);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(cliExtractor.handleSafe).toHaveBeenCalledTimes(1);
      expect(cliExtractor.handleSafe).toHaveBeenCalledWith([ 'node', 'script' ]);
      expect(shorthandResolver.handleSafe).toHaveBeenCalledTimes(1);
      expect(shorthandResolver.handleSafe).toHaveBeenCalledWith(defaultParameters);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(manager.instantiate).toHaveBeenNthCalledWith(2,
        'urn:solid-server:default:App',
        { variables: defaultVariables });
      expect(app.clusterManager.isSingleThreaded()).toBeFalsy();
      expect(app.start).toHaveBeenCalledTimes(0);
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
        '--seededPodConfigJson', '/different-path.json',
        '-w', '1',
      ];
      process.argv = argvParameters;

      await expect(new AppRunner().createCli()).resolves.toBe(app);

      expect(ComponentsManager.build).toHaveBeenCalledTimes(1);
      expect(ComponentsManager.build).toHaveBeenCalledWith({
        dumpErrorState: true,
        logLevel: 'debug',
        mainModulePath: '/var/cwd/module/path',
        typeChecking: false,
      });
      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register).toHaveBeenCalledWith('/var/cwd/myconfig.json');
      expect(manager.instantiate).toHaveBeenCalledTimes(2);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(cliExtractor.handleSafe).toHaveBeenCalledTimes(1);
      expect(cliExtractor.handleSafe).toHaveBeenCalledWith(argvParameters);
      expect(shorthandResolver.handleSafe).toHaveBeenCalledTimes(1);
      expect(shorthandResolver.handleSafe).toHaveBeenCalledWith(defaultParameters);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(manager.instantiate).toHaveBeenNthCalledWith(2,
        'urn:solid-server:default:App',
        { variables: defaultVariables });
      expect(app.start).toHaveBeenCalledTimes(0);
      expect(app.clusterManager.isSingleThreaded()).toBeFalsy();

      process.argv = argv;
    });

    it('checks for threading issues when starting in multithreaded mode.', async(): Promise<void> => {
      const createdApp = await new AppRunner().createCli();
      expect(createdApp).toBe(app);
      expect(listSingleThreadedComponentsMock).toHaveBeenCalled();
    });

    it('throws an error if there are threading issues detected.', async(): Promise<void> => {
      listSingleThreadedComponentsMock.mockImplementationOnce((): string[] => [ 'ViolatingClass' ]);

      let caughtError: Error = new Error('should disappear');
      try {
        await new AppRunner().createCli([ 'node', 'script' ]);
      } catch (error: unknown) {
        caughtError = error as Error;
      }
      expect(caughtError.message).toMatch(/^Cannot run a singlethreaded-only component in a multithreaded setup!/mu);
      expect(caughtError?.message).toMatch(
        /\[ViolatingClass\] is not threadsafe and should not be run in multithreaded setups!/mu,
      );

      expect(write).toHaveBeenCalledTimes(0);
      expect(exit).toHaveBeenCalledTimes(0);
    });

    it('throws an error if creating a ComponentsManager fails.', async(): Promise<void> => {
      (manager.configRegistry.register as jest.Mock).mockRejectedValueOnce(new Error('Fatal'));

      let caughtError: Error = new Error('should disappear');
      try {
        await new AppRunner().createCli([ 'node', 'script' ]);
      } catch (error: unknown) {
        caughtError = error as Error;
      }
      expect(caughtError.message).toMatch(/^Could not build the config files from .*default\.json/mu);
      expect(caughtError.message).toMatch(/^Cause: Fatal/mu);

      expect(write).toHaveBeenCalledTimes(0);
      expect(exit).toHaveBeenCalledTimes(0);
    });

    it('throws an error if instantiating the CliResolver fails.', async(): Promise<void> => {
      manager.instantiate.mockRejectedValueOnce(new Error('Fatal'));

      let caughtError: Error = new Error('should disappear');
      try {
        await new AppRunner().createCli([ 'node', 'script' ]);
      } catch (error: unknown) {
        caughtError = error as Error;
      }
      expect(caughtError.message).toMatch(/^Could not create the CLI resolver/mu);
      expect(caughtError.message).toMatch(/^Cause: Fatal/mu);

      expect(write).toHaveBeenCalledTimes(0);
      expect(exit).toHaveBeenCalledTimes(0);
    });

    it('throws an error if extracting the CLI shorthand values fails.', async(): Promise<void> => {
      cliExtractor.handleSafe.mockRejectedValueOnce(new Error('Fatal'));

      let caughtError: Error = new Error('should disappear');
      try {
        await new AppRunner().createCli([ 'node', 'script' ]);
      } catch (error: unknown) {
        caughtError = error as Error;
      }
      expect(caughtError.message).toMatch(/^Could not parse the CLI parameters/mu);
      expect(caughtError.message).toMatch(/^Cause: Fatal/mu);

      expect(write).toHaveBeenCalledTimes(0);
      expect(exit).toHaveBeenCalledTimes(0);
    });

    it('throws an error if resolving the shorthand values fails.', async(): Promise<void> => {
      shorthandResolver.handleSafe.mockRejectedValueOnce(new Error('Fatal'));

      let caughtError: Error = new Error('should disappear');
      try {
        await new AppRunner().createCli([ 'node', 'script' ]);
      } catch (error: unknown) {
        caughtError = error as Error;
      }
      expect(caughtError.message).toMatch(/^Could not resolve the shorthand values/mu);
      expect(caughtError.message).toMatch(/^Cause: Fatal/mu);

      expect(write).toHaveBeenCalledTimes(0);
      expect(exit).toHaveBeenCalledTimes(0);
    });

    it('throws an error if instantiating the server fails.', async(): Promise<void> => {
      // We want the second call to fail
      manager.instantiate
        .mockResolvedValueOnce({ cliExtractor, shorthandResolver })
        .mockRejectedValueOnce(new Error('Fatal'));

      let caughtError: Error = new Error('should disappear');
      try {
        await new AppRunner().createCli([ 'node', 'script' ]);
      } catch (error: unknown) {
        caughtError = error as Error;
      }
      expect(caughtError.message).toMatch(/^Could not create the server/mu);
      expect(caughtError.message).toMatch(/^Cause: Fatal/mu);

      expect(write).toHaveBeenCalledTimes(0);
      expect(exit).toHaveBeenCalledTimes(0);
    });

    it('throws an error if non-error objects get thrown.', async(): Promise<void> => {
      (manager.configRegistry.register as jest.Mock).mockRejectedValueOnce('NotAnError');

      let caughtError: Error = new Error('should disappear');
      try {
        await new AppRunner().createCli([ 'node', 'script' ]);
      } catch (error: unknown) {
        caughtError = error as Error;
      }
      expect(caughtError.message).toMatch(/^Cause: Unknown error: NotAnError$/mu);

      expect(write).toHaveBeenCalledTimes(0);
      expect(exit).toHaveBeenCalledTimes(0);
    });
  });

  describe('runCli', (): void => {
    it('runs the server.', async(): Promise<void> => {
      await expect(new AppRunner().runCli([ 'node', 'script' ])).resolves.toBeUndefined();

      expect(ComponentsManager.build).toHaveBeenCalledTimes(1);
      expect(ComponentsManager.build).toHaveBeenCalledWith({
        dumpErrorState: true,
        logLevel: 'info',
        mainModulePath: joinFilePath(__dirname, '../../../'),
        typeChecking: false,
      });
      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register)
        .toHaveBeenCalledWith(joinFilePath(__dirname, '/../../../config/default.json'));
      expect(manager.instantiate).toHaveBeenCalledTimes(2);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(cliExtractor.handleSafe).toHaveBeenCalledTimes(1);
      expect(cliExtractor.handleSafe).toHaveBeenCalledWith([ 'node', 'script' ]);
      expect(shorthandResolver.handleSafe).toHaveBeenCalledTimes(1);
      expect(shorthandResolver.handleSafe).toHaveBeenCalledWith(defaultParameters);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(manager.instantiate).toHaveBeenNthCalledWith(2,
        'urn:solid-server:default:App',
        { variables: defaultVariables });
      expect(app.start).toHaveBeenCalledTimes(1);
      expect(app.start).toHaveBeenLastCalledWith();
      expect(app.clusterManager.isSingleThreaded()).toBeFalsy();
    });

    it('runs the server honoring env variables.', async(): Promise<void> => {
      // Set logging level to debug
      const { env } = process;
      const OLD_STATE = env.CSS_LOGGING_LEVEL;
      env.CSS_LOGGING_LEVEL = 'debug';
      await expect(new AppRunner().runCli([ 'node', 'script' ])).resolves.toBeUndefined();

      expect(ComponentsManager.build).toHaveBeenCalledTimes(1);
      // Check logLevel to be set to debug instead of default `info`
      expect(ComponentsManager.build).toHaveBeenCalledWith({
        dumpErrorState: true,
        logLevel: 'info',
        mainModulePath: joinFilePath(__dirname, '../../../'),
        typeChecking: false,
      });
      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register)
        .toHaveBeenCalledWith(joinFilePath(__dirname, '/../../../config/default.json'));
      expect(manager.instantiate).toHaveBeenCalledTimes(2);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(cliExtractor.handleSafe).toHaveBeenCalledTimes(1);
      expect(cliExtractor.handleSafe).toHaveBeenCalledWith([ 'node', 'script' ]);
      expect(shorthandResolver.handleSafe).toHaveBeenCalledTimes(1);
      expect(shorthandResolver.handleSafe).toHaveBeenCalledWith(defaultParameters);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(manager.instantiate).toHaveBeenNthCalledWith(2,
        'urn:solid-server:default:App',
        { variables: defaultVariables });
      expect(app.start).toHaveBeenCalledTimes(1);
      expect(app.start).toHaveBeenLastCalledWith();

      // Reset env
      if (OLD_STATE) {
        env.CSS_LOGGING_LEVEL = OLD_STATE;
      } else {
        delete env.CSS_LOGGING_LEVEL;
      }
    });

    it('throws an error if the server could not start.', async(): Promise<void> => {
      app.start.mockRejectedValueOnce(new Error('Fatal'));

      let caughtError: Error = new Error('should disappear');
      try {
        await new AppRunner().runCli([ 'node', 'script' ]);
      } catch (error: unknown) {
        caughtError = error as Error;
      }
      expect(caughtError.message).toMatch(/^Could not start the server/mu);
      expect(caughtError.message).toMatch(/^Cause: Fatal/mu);

      expect(app.start).toHaveBeenCalledTimes(1);

      expect(write).toHaveBeenCalledTimes(0);

      expect(exit).toHaveBeenCalledTimes(0);
    });
  });

  describe('runCliSync', (): void => {
    it('starts the server.', async(): Promise<void> => {
      // eslint-disable-next-line no-sync
      new AppRunner().runCliSync({ argv: [ 'node', 'script' ]});

      // Wait until app.start has been called, because we can't await AppRunner.run.
      await flushPromises();

      expect(ComponentsManager.build).toHaveBeenCalledTimes(1);
      expect(ComponentsManager.build).toHaveBeenCalledWith({
        dumpErrorState: true,
        logLevel: 'info',
        mainModulePath: joinFilePath(__dirname, '../../../'),
        typeChecking: false,
      });
      expect(manager.configRegistry.register).toHaveBeenCalledTimes(1);
      expect(manager.configRegistry.register)
        .toHaveBeenCalledWith(joinFilePath(__dirname, '/../../../config/default.json'));
      expect(manager.instantiate).toHaveBeenCalledTimes(2);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(cliExtractor.handleSafe).toHaveBeenCalledTimes(1);
      expect(cliExtractor.handleSafe).toHaveBeenCalledWith([ 'node', 'script' ]);
      expect(shorthandResolver.handleSafe).toHaveBeenCalledTimes(1);
      expect(shorthandResolver.handleSafe).toHaveBeenCalledWith(defaultParameters);
      expect(manager.instantiate).toHaveBeenNthCalledWith(1, 'urn:solid-server-app-setup:default:CliResolver', {});
      expect(manager.instantiate).toHaveBeenNthCalledWith(2,
        'urn:solid-server:default:App',
        { variables: defaultVariables });
      expect(app.start).toHaveBeenCalledTimes(1);
      expect(app.start).toHaveBeenLastCalledWith();
      expect(app.clusterManager.isSingleThreaded()).toBeFalsy();
    });

    it('exits the process and writes to stderr if there was an error.', async(): Promise<void> => {
      manager.instantiate.mockRejectedValueOnce(new Error('Fatal'));

      // eslint-disable-next-line no-sync
      new AppRunner().runCliSync({ argv: [ 'node', 'script' ]});

      // Wait until app.start has been called, because we can't await AppRunner.runCli.
      await flushPromises();

      expect(write).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenLastCalledWith(expect.stringMatching(/Cause: Fatal/mu));

      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenLastCalledWith(1);
    });
  });
});
