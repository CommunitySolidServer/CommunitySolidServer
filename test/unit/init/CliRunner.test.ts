import * as path from 'path';
import { Loader } from 'componentsjs';
import { runCli } from '../../../src/init/CliRunner';
import type { Setup } from '../../../src/init/Setup';

const mainModulePath = path.join(__dirname, '../../../');

const mockSetup: jest.Mocked<Setup> = {
  setup: jest.fn(async(): Promise<any> => null),
} as any;
const loader: jest.Mocked<Loader> = {
  instantiateFromUrl: jest.fn(async(): Promise<any> => mockSetup),
  registerAvailableModuleResources: jest.fn(async(): Promise<any> => mockSetup),
} as any;

// Mock the Loader class.
jest.mock('componentsjs', (): any => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Loader: jest.fn((): Loader => loader),
}));

describe('CliRunner', (): void => {
  afterEach((): void => {
    jest.clearAllMocks();
  });

  it('starts the server with default settings.', async(): Promise<void> => {
    runCli({
      argv: [ 'node', 'script' ],
    });
    await mockSetup.setup();

    expect(Loader).toHaveBeenCalledTimes(1);
    expect(Loader).toHaveBeenCalledWith({ mainModulePath });
    expect(loader.instantiateFromUrl).toHaveBeenCalledTimes(1);
    expect(loader.instantiateFromUrl).toHaveBeenCalledWith(
      'urn:solid-server:default',
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
    expect(mockSetup.setup).toHaveBeenCalledTimes(1);
    expect(mockSetup.setup).toHaveBeenCalledWith();
  });

  it('accepts abbreviated flags.', async(): Promise<void> => {
    runCli({
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
    await mockSetup.setup();

    expect(loader.instantiateFromUrl).toHaveBeenCalledWith(
      'urn:solid-server:default',
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
    runCli({
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
    await mockSetup.setup();

    expect(loader.instantiateFromUrl).toHaveBeenCalledWith(
      'urn:solid-server:default',
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

  it('writes to stderr when an error occurs.', async(): Promise<void> => {
    jest.spyOn(process.stderr, 'write');
    loader.instantiateFromUrl.mockRejectedValueOnce(new Error('Fatal'));

    runCli();
    await new Promise((resolve): any => setImmediate(resolve));

    expect(process.stderr.write).toHaveBeenCalledTimes(1);
    expect(process.stderr.write).toHaveBeenCalledWith('Error: Fatal\n');
  });
});
