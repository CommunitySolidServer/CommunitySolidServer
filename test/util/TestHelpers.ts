import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import type { IncomingHttpHeaders } from 'http';
import { join } from 'path';
import * as url from 'url';
import type { MockResponse } from 'node-mocks-http';
import { createResponse } from 'node-mocks-http';
import streamifyArray from 'streamify-array';
import type { ResourceStore } from '../../index';
import { RepresentationMetadata } from '../../index';
import type { PermissionSet } from '../../src/ldp/permissions/PermissionSet';
import type { HttpHandler } from '../../src/server/HttpHandler';
import type { HttpRequest } from '../../src/server/HttpRequest';
import { CONTENT_TYPE } from '../../src/util/UriConstants';
import { call } from './Util';

export class AclTestHelper {
  public readonly store: ResourceStore;
  public id: string;

  public constructor(store: ResourceStore, id: string) {
    this.store = store;
    this.id = id;
  }

  public async setSimpleAcl(
    permissions: PermissionSet,
    agentClass: 'agent' | 'authenticated',
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
    acl.push(';\n acl:mode acl:Control');
    acl.push(`;\n acl:accessTo <${this.id}>`);
    acl.push(`;\n acl:default <${this.id}>`);
    acl.push(
      `;\n acl:agentClass ${
        agentClass === 'agent' ? 'foaf:Agent' : 'foaf:AuthenticatedAgent'
      }`,
    );

    acl.push('.');

    const representation = {
      binary: true,
      data: streamifyArray(acl),
      metadata: new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' }),
    };

    return this.store.setRepresentation(
      { path: `${this.id}.acl` },
      representation,
    );
  }
}

export class FileTestHelper {
  public readonly handler: HttpHandler;
  public readonly baseUrl: URL;

  public constructor(handler: HttpHandler, baseUrl: URL) {
    this.handler = handler;
    this.baseUrl = baseUrl;
  }

  public async simpleCall(
    requestUrl: URL,
    method: string,
    headers: IncomingHttpHeaders,
  ): Promise<MockResponse<any>> {
    return call(this.handler, requestUrl, method, headers, []);
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

  public async createFile(fileLocation: string, slug: string, mayFail = false): Promise<MockResponse<any>> {
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
    if (!mayFail) {
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toContain(url.format(this.baseUrl));
    }
    return response;
  }

  public async overwriteFile(fileLocation: string, requestUrl: string): Promise<MockResponse<any>> {
    const fileData = await fs.readFile(
      join(__dirname, fileLocation),
    );

    const putUrl = new URL(requestUrl);

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

  public async getFile(requestUrl: string): Promise<MockResponse<any>> {
    const getUrl = new URL(requestUrl);

    return this.simpleCall(getUrl, 'GET', { accept: '*/*' });
  }

  public async deleteFile(requestUrl: string, mayFail = false): Promise<MockResponse<any>> {
    const deleteUrl = new URL(requestUrl);

    const response = await this.simpleCall(deleteUrl, 'DELETE', {});
    if (!mayFail) {
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));
    }
    return response;
  }

  public async createFolder(slug: string): Promise<MockResponse<any>> {
    const response: MockResponse<any> = await this.simpleCall(
      this.baseUrl,
      'POST',
      {
        slug,
        link: '<http://www.w3.org/ns/ldp#Container>; rel="type"',
        'content-type': 'text/turtle',
        'transfer-encoding': 'chunked',
      },
    );
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toHaveLength(0);
    expect(response._getHeaders().location).toContain(url.format(this.baseUrl));
    return response;
  }

  public async getFolder(requestUrl: string): Promise<MockResponse<any>> {
    const getUrl = new URL(requestUrl);

    // `n-quads` allow for easy testing if a triple is present
    return await this.simpleCall(getUrl, 'GET', { accept: 'application/n-quads' });
  }

  public async deleteFolder(requestUrl: string): Promise<MockResponse<any>> {
    const deleteUrl = new URL(requestUrl);

    const response = await this.simpleCall(deleteUrl, 'DELETE', {});
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toHaveLength(0);
    expect(response._getHeaders().location).toBe(url.format(requestUrl));
    return response;
  }

  public async shouldNotExist(requestUrl: string): Promise<MockResponse<any>> {
    const getUrl = new URL(requestUrl);

    const response = await this.simpleCall(getUrl, 'GET', { accept: '*/*' });
    expect(response.statusCode).toBe(404);
    expect(response._getData()).toContain('NotFoundHttpError');
    return response;
  }
}
