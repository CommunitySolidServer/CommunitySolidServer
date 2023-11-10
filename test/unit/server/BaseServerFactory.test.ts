import type { RequestListener, Server } from 'node:http';
import request from 'supertest';
import type { BaseServerFactoryOptions } from '../../../src/server/BaseServerFactory';
import { BaseServerFactory } from '../../../src/server/BaseServerFactory';
import type { ServerConfigurator } from '../../../src/server/ServerConfigurator';
import { joinFilePath } from '../../../src/util/PathUtil';
import { getPort } from '../../util/Util';

const port = getPort('BaseServerFactory');

describe('A BaseServerFactory', (): void => {
  let server: Server;

  const options: [string, BaseServerFactoryOptions | undefined][] = [
    [ 'http', undefined ],
    [ 'https', {
      https: true,
      key: joinFilePath(__dirname, '../../assets/https/server.key'),
      cert: joinFilePath(__dirname, '../../assets/https/server.cert'),
    }],
  ];

  describe.each(options)('with %s', (protocol, httpOptions): void => {
    let rejectTls: string | undefined;
    let configurator: ServerConfigurator;
    let mockRequestHandler: jest.MockedFn<RequestListener>;

    beforeAll(async(): Promise<void> => {
      // Allow self-signed certificate
      rejectTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

      mockRequestHandler = jest.fn();

      configurator = {
        async handleSafe(serv: Server): Promise<void> {
          serv.on('request', mockRequestHandler);
        },
      } as any;

      const factory = new BaseServerFactory(configurator, httpOptions);
      server = await factory.createServer();

      server.listen(port);
    });

    beforeEach(async(): Promise<void> => {
      jest.clearAllMocks();
    });

    afterAll(async(): Promise<void> => {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = rejectTls;
      server.close();
    });

    it('emits a request event on requests.', async(): Promise<void> => {
      let resolveProm: (value: unknown) => void;
      const requestProm = new Promise((resolve): void => {
        resolveProm = resolve;
      });
      server.on('request', (req, res): void => {
        resolveProm(req);
        res.writeHead(200);
        res.end();
      });
      await request(server).get('/').set('Host', 'test.com').expect(200);

      await expect(requestProm).resolves.toEqual(expect.objectContaining({
        headers: expect.objectContaining({ host: 'test.com' }),
      }));

      expect(mockRequestHandler).toHaveBeenCalledTimes(1);
    });
  });
});
