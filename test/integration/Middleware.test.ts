import type { Server } from 'http';
import request from 'supertest';
import type { BaseHttpServerFactory } from '../../src/server/BaseHttpServerFactory';
import type { HttpHandlerInput } from '../../src/server/HttpHandler';
import { HttpHandler } from '../../src/server/HttpHandler';
import { getPort } from '../util/Util';
import { getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('Middleware');

class SimpleHttpHandler extends HttpHandler {
  public async handle(input: HttpHandlerInput): Promise<void> {
    input.response.writeHead(200, { location: '/' });
    input.response.end('Hello World');
  }
}

describe('An http server with middleware', (): void => {
  let server: Server;

  beforeAll(async(): Promise<void> => {
    const factory = await instantiateFromConfig(
      'urn:solid-server:default:HttpServerFactory',
      getTestConfigPath('server-middleware.json'),
      {
        'urn:solid-server:default:LdpHandler': new SimpleHttpHandler(),
        'urn:solid-server:default:variable:baseUrl': 'https://example.pod/',
        'urn:solid-server:default:variable:showStackTrace': true,
      },
    ) as BaseHttpServerFactory;
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    server.close();
  });

  it('sets a Vary header containing Accept.', async(): Promise<void> => {
    const res = await request(server).get('/');
    expect(res.header).toEqual(expect.objectContaining({
      vary: expect.stringMatching(/(^|,)\s*Accept\s*(,|$)/iu),
    }));
  });

  it('sets a Vary header containing Authorization.', async(): Promise<void> => {
    const res = await request(server).get('/');
    expect(res.header).toEqual(expect.objectContaining({
      vary: expect.stringMatching(/(^|,)\s*Authorization\s*(,|$)/iu),
    }));
  });

  it('sets a Vary header containing Origin.', async(): Promise<void> => {
    const res = await request(server).get('/');
    expect(res.header).toEqual(expect.objectContaining({
      vary: expect.stringMatching(/(^|,)\s*Origin\s*(,|$)/iu),
    }));
  });

  it('sends server identification in the X-Powered-By header.', async(): Promise<void> => {
    const res = await request(server).get('/');
    expect(res.header).toEqual(expect.objectContaining({
      'x-powered-by': 'Community Solid Server',
    }));
  });

  it('returns all relevant headers for an OPTIONS request.', async(): Promise<void> => {
    const res = await request(server)
      .options('/')
      .set('Access-Control-Allow-Credentials', 'true')
      .set('Access-Control-Request-Headers', 'content-type')
      .set('Access-Control-Request-Method', 'POST')
      .set('Host', 'test.com')
      .expect(204);
    expect(res.header).toEqual(expect.objectContaining({
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'updates-via': 'wss://example.pod/',
      'x-powered-by': 'Community Solid Server',
    }));
    const { vary } = res.header;
    expect(vary).toMatch(/(^|,)\s*Accept\s*(,|$)/iu);
    expect(vary).toMatch(/(^|,)\s*Authorization\s*(,|$)/iu);
    expect(vary).toMatch(/(^|,)\s*Origin\s*(,|$)/iu);
    const corsMethods = res.header['access-control-allow-methods'].split(',')
      .map((method: string): string => method.trim());
    const allowedMethods = [ 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE' ];
    expect(corsMethods).toEqual(expect.arrayContaining(allowedMethods));
    expect(corsMethods).toHaveLength(allowedMethods.length);
  });

  it('specifies CORS origin header if an origin was supplied.', async(): Promise<void> => {
    const res = await request(server).get('/').set('origin', 'test.com').expect(200);
    expect(res.header).toEqual(expect.objectContaining({ 'access-control-allow-origin': 'test.com' }));
  });

  it('exposes the Accept-Patch header via CORS.', async(): Promise<void> => {
    const res = await request(server).get('/').expect(200);
    const exposed = res.header['access-control-expose-headers'];
    expect(exposed.split(/\s*,\s*/u)).toContain('Accept-Patch');
  });

  it('exposes the Last-Modified and ETag headers via CORS.', async(): Promise<void> => {
    const res = await request(server).get('/').expect(200);
    const exposed = res.header['access-control-expose-headers'];
    expect(exposed.split(/\s*,\s*/u)).toContain('ETag');
    expect(exposed.split(/\s*,\s*/u)).toContain('Last-Modified');
  });

  it('exposes the Link header via CORS.', async(): Promise<void> => {
    const res = await request(server).get('/').expect(200);
    const exposed = res.header['access-control-expose-headers'];
    expect(exposed.split(/\s*,\s*/u)).toContain('Link');
  });

  it('exposes the Location header via CORS.', async(): Promise<void> => {
    const res = await request(server).get('/').expect(200);
    const exposed = res.header['access-control-expose-headers'];
    expect(exposed.split(/\s*,\s*/u)).toContain('Location');
  });

  it('exposes the MS-Author-Via header via CORS.', async(): Promise<void> => {
    const res = await request(server).get('/').expect(200);
    const exposed = res.header['access-control-expose-headers'];
    expect(exposed.split(/\s*,\s*/u)).toContain('MS-Author-Via');
  });

  it('exposes the WAC-Allow header via CORS.', async(): Promise<void> => {
    const res = await request(server).get('/').expect(200);
    const exposed = res.header['access-control-expose-headers'];
    expect(exposed.split(/\s*,\s*/u)).toContain('WAC-Allow');
  });

  it('exposes the Updates-Via header via CORS.', async(): Promise<void> => {
    const res = await request(server).get('/').expect(200);
    const exposed = res.header['access-control-expose-headers'];
    expect(exposed.split(/\s*,\s*/u)).toContain('Updates-Via');
  });

  it('sends incoming requests to the handler.', async(): Promise<void> => {
    const response = request(server).get('/').set('Host', 'test.com');
    expect(response).toBeDefined();
    await response.expect(200).expect('Hello World');
  });
});
