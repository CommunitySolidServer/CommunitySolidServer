import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import type { IncomingHttpHeaders } from 'http';
import { Readable } from 'stream';
import type { MockResponse } from 'node-mocks-http';
import { createResponse } from 'node-mocks-http';
import type { ResourceStore, PermissionSet, HttpHandler, HttpRequest } from '../../src/';
import { BasicRepresentation, joinFilePath } from '../../src/';
import { performRequest } from './Util';

/* eslint-disable jest/no-standalone-expect */
export class AclHelper {
  public readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    this.store = store;
  }

  public async setSimpleAcl(
    resource: string,
    options: {
      permissions: Partial<PermissionSet>;
      agentClass?: 'agent' | 'authenticated';
      agent?: string;
      accessTo?: boolean;
      default?: boolean;
    },
  ): Promise<void> {
    if (!options.agentClass && !options.agent) {
      throw new Error('At least one of agentClass or agent have to be provided for this to make sense.');
    }
    if (!options.accessTo && !options.default) {
      throw new Error('At least one of accessTo or default have to be true for this to make sense.');
    }

    const acl: string[] = [
      '@prefix   acl:  <http://www.w3.org/ns/auth/acl#>.\n',
      '@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.\n',
      '<http://test.com/#auth> a acl:Authorization',
    ];

    for (const perm of [ 'Read', 'Append', 'Write', 'Control' ]) {
      if (options.permissions[perm.toLowerCase() as keyof PermissionSet]) {
        acl.push(`;\n acl:mode acl:${perm}`);
      }
    }
    if (options.accessTo) {
      acl.push(`;\n acl:accessTo <${resource}>`);
    }
    if (options.default) {
      acl.push(`;\n acl:default <${resource}>`);
    }
    if (options.agentClass) {
      acl.push(
        `;\n acl:agentClass ${
          options.agentClass === 'agent' ? 'foaf:Agent' : 'foaf:AuthenticatedAgent'
        }`,
      );
    }
    if (options.agent) {
      acl.push(`;\n acl:agent ${options.agent}`);
    }

    acl.push('.');

    await this.store.setRepresentation({ path: `${resource}.acl` }, new BasicRepresentation(acl, 'text/turtle'));
  }
}

export class ResourceHelper {
  public readonly handler: HttpHandler;
  public readonly baseUrl: URL;

  public constructor(handler: HttpHandler, baseUrl: string) {
    this.handler = handler;
    this.baseUrl = new URL(baseUrl);
  }

  public async performRequest(
    requestUrl: URL,
    method: string,
    headers: IncomingHttpHeaders,
  ): Promise<MockResponse<any>> {
    return performRequest(this.handler, requestUrl, method, headers, []);
  }

  public async performRequestWithBody(
    requestUrl: URL,
    method: string,
    headers: IncomingHttpHeaders,
    data: Buffer,
  ): Promise<MockResponse<any>> {
    const request = Readable.from([ data ]) as HttpRequest;
    request.url = `${requestUrl.pathname}${requestUrl.search}`;
    request.method = method;
    request.headers = headers;
    request.headers.host = requestUrl.host;
    const response: MockResponse<any> = createResponse({
      eventEmitter: EventEmitter,
    });

    const endPromise = new Promise((resolve): void => {
      response.on('end', (): void => {
        expect(response._isEndCalled()).toBeTruthy();
        resolve();
      });
    });

    await this.handler.handleSafe({ request, response });
    await endPromise;

    return response;
  }

  public async createResource(fileLocation: string, path: string, contentType: string, mayFail = false):
  Promise<MockResponse<any>> {
    const fileData = await fs.readFile(
      joinFilePath(__dirname, fileLocation),
    );

    const response: MockResponse<any> = await this.performRequestWithBody(
      new URL(path, this.baseUrl),
      'PUT',
      { 'content-type': contentType,
        'transfer-encoding': 'chunked' },
      fileData,
    );
    if (!mayFail) {
      expect(response.statusCode).toBe(205);
      expect(response._getData()).toHaveLength(0);
    }
    return response;
  }

  public async replaceResource(fileLocation: string, requestUrl: string, contentType: string):
  Promise<MockResponse<any>> {
    const fileData = await fs.readFile(
      joinFilePath(__dirname, fileLocation),
    );

    const putUrl = new URL(requestUrl);

    const response: MockResponse<any> = await this.performRequestWithBody(
      putUrl,
      'PUT',
      { 'content-type': contentType, 'transfer-encoding': 'chunked' },
      fileData,
    );
    expect(response.statusCode).toBe(205);
    expect(response._getData()).toHaveLength(0);
    return response;
  }

  public async getResource(requestUrl: string): Promise<MockResponse<any>> {
    const getUrl = new URL(requestUrl);

    const response = await this.performRequest(getUrl, 'GET', { accept: '*/*' });
    expect(response.statusCode).toBe(200);
    return response;
  }

  public async deleteResource(requestUrl: string, mayFail = false): Promise<MockResponse<any>> {
    const deleteUrl = new URL(requestUrl);

    const response = await this.performRequest(deleteUrl, 'DELETE', {});
    if (!mayFail) {
      expect(response.statusCode).toBe(205);
      expect(response._getData()).toHaveLength(0);
    }
    return response;
  }

  public async createContainer(path: string): Promise<MockResponse<any>> {
    const response: MockResponse<any> = await this.performRequest(
      new URL(path, this.baseUrl),
      'PUT',
      {
        link: '<http://www.w3.org/ns/ldp#Container>; rel="type"',
        'content-type': 'text/turtle',
        'transfer-encoding': 'chunked',
      },
    );
    expect(response.statusCode).toBe(205);
    expect(response._getData()).toHaveLength(0);
    return response;
  }

  public async getContainer(requestUrl: string): Promise<MockResponse<any>> {
    const getUrl = new URL(requestUrl);

    // `n-quads` allow for easy testing if a triple is present
    return await this.performRequest(getUrl, 'GET', { accept: 'application/n-quads' });
  }

  public async shouldNotExist(requestUrl: string): Promise<MockResponse<any>> {
    const getUrl = new URL(requestUrl);

    const response = await this.performRequest(getUrl, 'GET', { accept: '*/*' });
    expect(response.statusCode).toBe(404);
    expect(response._getData()).toContain('NotFoundHttpError');
    return response;
  }
}

export function describeIf(envFlag: string, name: string, fn: () => void): void {
  const flag = `TEST_${envFlag.toUpperCase()}`;
  const enabled = !/^(|0|false)$/iu.test(process.env[flag] ?? '');
  // eslint-disable-next-line jest/valid-describe, jest/valid-title, jest/no-disabled-tests
  return enabled ? describe(name, fn) : describe.skip(name, fn);
}
