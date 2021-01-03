import type { Server } from 'http';
import { PassThrough } from 'stream';
import fetch from 'cross-fetch';
import {
  RepresentationMetadata,
  TypedRepresentationConverter,
  guardStream, readableToString,
} from '../../src';
import type {
  Representation,
  RepresentationConverterArgs,
  ExpressHttpServerFactory,
} from '../../src';
import { instantiateFromConfig } from './Config';

const port = 6005;
const serverUrl = `http://localhost:${port}/`;

const scheduleCrash = jest.fn();

class CrashingConverter extends TypedRepresentationConverter {
  public async getInputTypes(): Promise<Record<string, number>> {
    return { '*/*': 1 };
  }

  public async getOutputTypes(): Promise<Record<string, number>> {
    return { 'custom/type': 1 };
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const data = guardStream(new PassThrough());
    const metadata = new RepresentationMetadata(representation.metadata);

    scheduleCrash(representation);

    return { binary: true, data, metadata };
  }
}

describe('A server with crashing converters', (): void => {
  let server: Server;

  beforeAll(async(): Promise<void> => {
    const factory = await instantiateFromConfig(
      'urn:solid-server:default:ExpressHttpServerFactory', 'converters.json', {
        'urn:solid-server:default:variable:port': port,
        'urn:solid-server:default:variable:baseUrl': serverUrl,
        'urn:solid-server:default:variable:podTemplateFolder': '',
        'urn:solid-server:default:variable:converter': new CrashingConverter(),
      },
    ) as ExpressHttpServerFactory;
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    server.close();
  });

  describe('that has an async call to readableToString', (): void => {
    beforeAll((): void => {
      scheduleCrash.mockImplementation((representation: Representation): void => {
        setImmediate(async(): Promise<void> => {
          await readableToString(representation.data);
        });
      });
    });

    it('terminates the response.', async(): Promise<void> => {
      const response = await fetch(`${serverUrl}test`, {
        method: 'PUT',
        headers: {
          'content-type': 'text/turtle',
        },
        body: '<a:b> <a:b> c!',
      });
      expect(await response.text()).toBe('');
    });
  });

  describe('that emits an error on data', (): void => {
    beforeAll((): void => {
      scheduleCrash.mockImplementation((representation: Representation): void => {
        representation.data.on('data', (): void => {
          representation.data.emit('error', new Error('emitted error'));
        });
      });
    });

    it('terminates the response.', async(): Promise<void> => {
      const response = await fetch(serverUrl);
      expect(await response.text()).toBe('');
    });
  });

  describe('that throws error on data', (): void => {
    beforeAll((): void => {
      scheduleCrash.mockImplementation((representation: Representation): void => {
        representation.data.on('data', (): never => {
          throw new Error('sync error');
        });
      });
    });

    it('terminates the response.', async(): Promise<void> => {
      const response = await fetch(serverUrl);
      expect(await response.text()).toBe('');
    });
  });

  describe('that asynchronously throws error on data', (): void => {
    beforeAll((): void => {
      scheduleCrash.mockImplementation((representation: Representation): void => {
        representation.data.on('data', async(): Promise<never> => {
          throw new Error('async error');
        });
      });
    });

    it('terminates the response.', async(): Promise<void> => {
      const response = await fetch(serverUrl);
      expect(await response.text()).toBe('');
    });
  });
});
