import type { Server } from 'node:http';
import request from 'supertest';
import type { App } from '../../src/init/App';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { splitCommaSeparated } from '../../src/util/StringUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('Middleware');

describe('An http server with middleware', (): void => {
  let app: App;
  let server: Server;

  beforeAll(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getTestConfigPath('server-middleware.json'),
      ],
      getDefaultVariables(port),
    ) as { app: App; factory: HttpServerFactory };

    ({ app } = instances);

    server = await instances.factory.createServer();
    server.listen(port);
  });

  afterAll(async(): Promise<void> => {
    server.close();
    // Even though the server was started separately, there might still be finalizers that need to be stopped
    await app.stop();
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
    const res = await request(server).options('/').set('origin', 'test.com').expect(204);
    expect(res.header).toEqual(expect.objectContaining({ 'access-control-allow-origin': 'test.com' }));
  });

  it('exposes the Accept-[Method] header via CORS.', async(): Promise<void> => {
    const res = await request(server).options('/').expect(204);
    const exposed = res.header['access-control-expose-headers'];
    expect(splitCommaSeparated(exposed)).toContain('Accept-Patch');
    expect(splitCommaSeparated(exposed)).toContain('Accept-Post');
    expect(splitCommaSeparated(exposed)).toContain('Accept-Put');
  });

  it('exposes the Last-Modified and ETag headers via CORS.', async(): Promise<void> => {
    const res = await request(server).options('/').expect(204);
    const exposed = res.header['access-control-expose-headers'];
    expect(splitCommaSeparated(exposed)).toContain('ETag');
    expect(splitCommaSeparated(exposed)).toContain('Last-Modified');
  });

  it('exposes the Link header via CORS.', async(): Promise<void> => {
    const res = await request(server).options('/').expect(204);
    const exposed = res.header['access-control-expose-headers'];
    expect(splitCommaSeparated(exposed)).toContain('Link');
  });

  it('exposes the Location header via CORS.', async(): Promise<void> => {
    const res = await request(server).options('/').expect(204);
    const exposed = res.header['access-control-expose-headers'];
    expect(splitCommaSeparated(exposed)).toContain('Location');
  });

  it('exposes the WAC-Allow header via CORS.', async(): Promise<void> => {
    const res = await request(server).options('/').expect(204);
    const exposed = res.header['access-control-expose-headers'];
    expect(splitCommaSeparated(exposed)).toContain('WAC-Allow');
  });

  it('exposes the Updates-Via header via CORS.', async(): Promise<void> => {
    const res = await request(server).options('/').expect(204);
    const exposed = res.header['access-control-expose-headers'];
    expect(splitCommaSeparated(exposed)).toContain('Updates-Via');
  });

  it('exposes the Www-Authenticate header via CORS.', async(): Promise<void> => {
    const res = await request(server).options('/').expect(204);
    const exposed = res.header['access-control-expose-headers'];
    expect(splitCommaSeparated(exposed)).toContain('Www-Authenticate');
  });
});
