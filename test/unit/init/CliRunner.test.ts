import * as path from 'path';
import { Loader } from 'componentsjs';
import { CliRunner } from '../../../src/init/CliRunner';
import type { Initializer } from '../../../src/init/Initializer';

const mainModulePath = path.join(__dirname, '../../../');

const initializer: jest.Mocked<Initializer> = {
  handleSafe: jest.fn(),
} as any;

const loader: jest.Mocked<Loader> = {
  instantiateFromUrl: jest.fn(async(): Promise<any> => initializer),
  registerAvailableModuleResources: jest.fn(),
} as any;

jest.mock('componentsjs', (): any => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Loader: jest.fn((): Loader => loader),
}));

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
    await initializer.handleSafe();

    expect(Loader).toHaveBeenCalledTimes(1);
    expect(Loader).toHaveBeenCalledWith({ mainModulePath });
    expect(loader.instantiateFromUrl).toHaveBeenCalledTimes(1);
    expect(loader.instantiateFromUrl).toHaveBeenCalledWith(
      'urn:solid-server:default:Initializer',
      path.join(__dirname, '/../../../config/config-default.json'),
      undefined,
      {
        variables: {
          'urn:solid-server:default:variable:port': 3000,
          'urn:solid-server:default:variable:baseUrl': 'http://localhost:3000/',
          'urn:solid-server:default:variable:rootFilePath': process.cwd(),
          'urn:solid-server:default:variable:sparqlEndpoint': undefined,
          'urn:solid-server:default:variable:loggingLevel': 'info',
          'urn:solid-server:default:variable:podTemplateFolder': path.join(__dirname, '../../../templates'),
        },
      },
    );
    expect(loader.registerAvailableModuleResources).toHaveBeenCalledTimes(1);
    expect(loader.registerAvailableModuleResources).toHaveBeenCalledWith();
    expect(initializer.handleSafe).toHaveBeenCalledTimes(1);
    expect(initializer.handleSafe).toHaveBeenCalledWith();
  });

  it('accepts abbreviated flags.', async(): Promise<void> => {
    new CliRunner().run({
      argv: [
        'node', 'script',
        '-p', '4000',
        '-b', 'http://pod.example/',
        '-c', 'myconfig.json',
        '-f', '/root',
        '-s', 'http://localhost:5000/sparql',
        '-l', 'debug',
        '-t', 'templates',
      ],
    });
    await initializer.handleSafe();

    expect(loader.instantiateFromUrl).toHaveBeenCalledWith(
      'urn:solid-server:default:Initializer',
      path.join(process.cwd(), 'myconfig.json'),
      undefined,
      {
        variables: {
          'urn:solid-server:default:variable:port': 4000,
          'urn:solid-server:default:variable:baseUrl': 'http://pod.example/',
          'urn:solid-server:default:variable:rootFilePath': '/root',
          'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:5000/sparql',
          'urn:solid-server:default:variable:loggingLevel': 'debug',
          'urn:solid-server:default:variable:podTemplateFolder': 'templates',
        },
      },
    );
  });

  it('accepts full flags.', async(): Promise<void> => {
    new CliRunner().run({
      argv: [
        'node', 'script',
        '--port', '4000',
        '--baseUrl', 'http://pod.example/',
        '--config', 'myconfig.json',
        '--rootFilePath', '/root',
        '--sparqlEndpoint', 'http://localhost:5000/sparql',
        '--loggingLevel', 'debug',
        '--podTemplateFolder', 'templates',
      ],
    });
    await initializer.handleSafe();

    expect(loader.instantiateFromUrl).toHaveBeenCalledWith(
      'urn:solid-server:default:Initializer',
      path.join(process.cwd(), 'myconfig.json'),
      undefined,
      {
        variables: {
          'urn:solid-server:default:variable:port': 4000,
          'urn:solid-server:default:variable:baseUrl': 'http://pod.example/',
          'urn:solid-server:default:variable:rootFilePath': '/root',
          'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:5000/sparql',
          'urn:solid-server:default:variable:loggingLevel': 'debug',
          'urn:solid-server:default:variable:podTemplateFolder': 'templates',
        },
      },
    );
  });

  it('exits with output to stderr when instantiation fails.', async(): Promise<void> => {
    loader.instantiateFromUrl.mockRejectedValueOnce(new Error('Fatal'));
    new CliRunner().run();
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
