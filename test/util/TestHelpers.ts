import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { IncomingHttpHeaders } from 'http';
import { join } from 'path';
import * as url from 'url';
import { createResponse, MockResponse } from 'node-mocks-http';
import streamifyArray from 'streamify-array';
import { ResourceStore } from '../../index';
import { PermissionSet } from '../../src/ldp/permissions/PermissionSet';
import { HttpHandler } from '../../src/server/HttpHandler';
import { HttpRequest } from '../../src/server/HttpRequest';

export class AclTestHelper {
  public readonly store: ResourceStore;
  public id: string;

  public constructor(store: ResourceStore, id: string) {
    this.store = store;
    this.id = id;
  }

  public async setAcl(
    permissions: PermissionSet,
    control: boolean,
    access: boolean,
    def: boolean,
    agent?: string,
    agentClass?: 'agent' | 'authenticated',
  ): Promise<void> {
    const acl: string[] = [
      '@prefix   acl:  <http://www.w3.org/ns/auth/acl#>.\n',
      '@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.\n',
      '<http://test.com/#auth> a acl:Authorization',
    ];

    for (const perm of [ 'Read', 'Append', 'Write', 'Delete' ]) {
      if (permissions[perm.toLowerCase() as keyof PermissionSet]) {
        acl.push(`;\n acl:mode acl:${perm}`);
      }
    }
    if (control) {
      acl.push(';\n acl:mode acl:Control');
    }
    if (access) {
      acl.push(`;\n acl:accessTo <${this.id}>`);
    }
    if (def) {
      acl.push(`;\n acl:default <${this.id}>`);
    }
    if (agent) {
      acl.push(`;\n acl:agent <${agent}>`);
    }
    if (agentClass) {
      acl.push(
        `;\n acl:agentClass ${
          agentClass === 'agent' ? 'foaf:Agent' : 'foaf:AuthenticatedAgent'
        }`,
      );
    }

    acl.push('.');

    const representation = {
      binary: true,
      data: streamifyArray(acl),
      metadata: {
        raw: [],
        profiles: [],
        contentType: 'text/turtle',
      },
    };

    return this.store.setRepresentation(
      { path: `${this.id}.acl` },
      representation,
    );
  }

  public async setSimpleAcl(
    permissions: PermissionSet,
    agentClass?: 'agent' | 'authenticated',
  ): Promise<void> {
    return this.setAcl(permissions, true, true, true, undefined, agentClass);
  }
}

export class FileTestHelper {
  public readonly handler: HttpHandler;
  public readonly baseUrl: URL;

  public constructor(handler: HttpHandler, baseUrl: URL) {
    this.handler = handler;
    this.baseUrl = baseUrl;
  }

  public async call(
    requestUrl: URL,
    method: string,
    headers: IncomingHttpHeaders,
    data?: string[],
  ): Promise<MockResponse<any>> {
    const request = data ?
      (streamifyArray(data) as HttpRequest) :
      streamifyArray([]) as HttpRequest;

    request.url = requestUrl.pathname;
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

  public async callWithFile(
    requestUrl: URL,
    method: string,
    headers: IncomingHttpHeaders,
    data: Buffer,
  ): Promise<MockResponse<any>> {
    const request = streamifyArray([ data ]) as HttpRequest;

    request.url = requestUrl.pathname;
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

  public async createFile(fileLocation: string, slug: string): Promise<MockResponse<any>> {
    if (!fileLocation.startsWith('..')) {
      throw new Error(`${fileLocation} is not a relative path`);
    }
    const fileData = await fs.readFile(
      join(__dirname, fileLocation),
    );

    const response: MockResponse<any> = await this.callWithFile(
      this.baseUrl,
      'POST',
      { 'content-type': 'application/octet-stream',
        slug,
        'transfer-encoding': 'chunked' },
      fileData,
    );
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toHaveLength(0);
    expect(response._getHeaders().location).toContain(url.format(this.baseUrl));
    return response;
  }

  public async overwriteFile(fileLocation: string, requestUrl: string | URL): Promise<MockResponse<any>> {
    if (!fileLocation.startsWith('..')) {
      throw new Error(`${fileLocation} is not a relative path`);
    }
    const fileData = await fs.readFile(
      join(__dirname, fileLocation),
    );

    const putUrl =
      typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;

    const response: MockResponse<any> = await this.callWithFile(
      putUrl,
      'PUT',
      { 'content-type': 'application/octet-stream', 'transfer-encoding': 'chunked' },
      fileData,
    );
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toHaveLength(0);
    expect(response._getHeaders().location).toContain(url.format(putUrl));
    return response;
  }

  public async getFile(requestUrl: string | URL): Promise<MockResponse<any>> {
    const getUrl =
      typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;

    const response = await this.call(getUrl, 'GET', { accept: '*/*' });
    return response;
  }

  public async deleteFile(requestUrl: string | URL): Promise<MockResponse<any>> {
    const deleteUrl =
      typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;

    const response = await this.call(deleteUrl, 'DELETE', {});
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toHaveLength(0);
    expect(response._getHeaders().location).toBe(url.format(requestUrl));
    return response;
  }

  public async createFolder(slug: string): Promise<MockResponse<any>> {
    const response: MockResponse<any> = await this.call(
      this.baseUrl,
      'POST',
      {
        slug,
        link: '<http://www.w3.org/ns/ldp#Container>; rel="type"',
        'content-type': 'text/plain',
        'transfer-encoding': 'chunked',
      },
    );
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toHaveLength(0);
    expect(response._getHeaders().location).toContain(url.format(this.baseUrl));
    return response;
  }

  public async getFolder(requestUrl: string | URL): Promise<MockResponse<any>> {
    const getUrl =
      typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;

    const response = await this.call(getUrl, 'GET', { accept: 'text/turtle' });
    return response;
  }

  public async deleteFolder(requestUrl: string | URL): Promise<MockResponse<any>> {
    const deleteUrl =
      typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;

    const response = await this.call(deleteUrl, 'DELETE', {});
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toHaveLength(0);
    expect(response._getHeaders().location).toBe(url.format(requestUrl));
    return response;
  }

  public async shouldNotExist(requestUrl: string | URL): Promise<MockResponse<any>> {
    const getUrl =
      typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;

    const response = await this.call(getUrl, 'GET', { accept: '*/*' });
    expect(response.statusCode).toBe(404);
    expect(response._getData()).toContain('NotFoundHttpError');
    return response;
  }
}
