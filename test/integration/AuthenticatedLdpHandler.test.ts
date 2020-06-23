import { AuthenticatedLdpHandler } from '../../src/ldp/AuthenticatedLdpHandler';
import { CompositeAsyncHandler } from '../../src/util/CompositeAsyncHandler';
import { EventEmitter } from 'events';
import { HttpRequest } from '../../src/server/HttpRequest';
import { Operation } from '../../src/ldp/operations/Operation';
import { ResponseDescription } from '../../src/ldp/operations/ResponseDescription';
import { SimpleAuthorizer } from '../../src/authorization/SimpleAuthorizer';
import { SimpleBodyParser } from '../../src/ldp/http/SimpleBodyParser';
import { SimpleCredentialsExtractor } from '../../src/authentication/SimpleCredentialsExtractor';
import { SimpleDeleteOperationHandler } from '../../src/ldp/operations/SimpleDeleteOperationHandler';
import { SimpleGetOperationHandler } from '../../src/ldp/operations/SimpleGetOperationHandler';
import { SimplePermissionsExtractor } from '../../src/ldp/permissions/SimplePermissionsExtractor';
import { SimplePostOperationHandler } from '../../src/ldp/operations/SimplePostOperationHandler';
import { SimplePreferenceParser } from '../../src/ldp/http/SimplePreferenceParser';
import { SimpleRequestParser } from '../../src/ldp/http/SimpleRequestParser';
import { SimpleResourceStore } from '../../src/storage/SimpleResourceStore';
import { SimpleResponseWriter } from '../../src/ldp/http/SimpleResponseWriter';
import { SimpleTargetExtractor } from '../../src/ldp/http/SimpleTargetExtractor';
import streamifyArray from 'streamify-array';
import { createResponse, MockResponse } from 'node-mocks-http';

describe('An AuthenticatedLdpHandler with instantiated handlers', (): void => {
  let handler: AuthenticatedLdpHandler;

  beforeEach(async(): Promise<void> => {
    const requestParser = new SimpleRequestParser({
      targetExtractor: new SimpleTargetExtractor(),
      preferenceParser: new SimplePreferenceParser(),
      bodyParser: new SimpleBodyParser(),
    });

    const credentialsExtractor = new SimpleCredentialsExtractor();
    const permissionsExtractor = new SimplePermissionsExtractor();
    const authorizer = new SimpleAuthorizer();

    const store = new SimpleResourceStore('http://test.com/');
    const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
      new SimpleGetOperationHandler(store),
      new SimplePostOperationHandler(store),
      new SimpleDeleteOperationHandler(store),
    ]);

    const responseWriter = new SimpleResponseWriter();

    handler = new AuthenticatedLdpHandler({
      requestParser,
      credentialsExtractor,
      permissionsExtractor,
      authorizer,
      operationHandler,
      responseWriter,
    });
  });

  it('can add, read and delete data based on incoming requests.', async(): Promise<void> => {
    // POST
    let request = streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]) as HttpRequest;
    request.url = 'http://test.com/';
    request.method = 'POST';
    request.headers = {
      'content-type': 'text/turtle',
    };
    let response: MockResponse<any> = createResponse({ eventEmitter: EventEmitter });

    let id;
    let endPromise = new Promise((resolve): void => {
      response.on('end', (): void => {
        expect(response._isEndCalled()).toBeTruthy();
        expect(response.statusCode).toBe(200);
        expect(response._getData()).toHaveLength(0);
        id = response._getHeaders().location;
        expect(id).toContain(request.url);
        resolve();
      });
    });

    await handler.handleSafe({ request, response });
    await endPromise;

    // GET
    request = {} as HttpRequest;
    request.url = id;
    request.method = 'GET';
    request.headers = {
      accept: 'text/turtle',
    };
    response = createResponse({ eventEmitter: EventEmitter });

    endPromise = new Promise((resolve): void => {
      response.on('end', (): void => {
        expect(response._isEndCalled()).toBeTruthy();
        expect(response.statusCode).toBe(200);
        expect(response._getData()).toContain('<http://test.com/s> <http://test.com/p> <http://test.com/o>.');
        expect(response._getHeaders().location).toBe(request.url);
        resolve();
      });
    });

    await handler.handleSafe({ request, response });
    await endPromise;

    // DELETE
    request = {} as HttpRequest;
    request.url = id;
    request.method = 'DELETE';
    request.headers = {};
    response = createResponse({ eventEmitter: EventEmitter });

    endPromise = new Promise((resolve): void => {
      response.on('end', (): void => {
        expect(response._isEndCalled()).toBeTruthy();
        expect(response.statusCode).toBe(200);
        expect(response._getData()).toHaveLength(0);
        expect(response._getHeaders().location).toBe(request.url);
        resolve();
      });
    });

    await handler.handleSafe({ request, response });
    await endPromise;

    // GET
    request = {} as HttpRequest;
    request.url = id;
    request.method = 'GET';
    request.headers = {
      accept: 'text/turtle',
    };
    response = createResponse({ eventEmitter: EventEmitter });

    endPromise = new Promise((resolve): void => {
      response.on('end', (): void => {
        expect(response._isEndCalled()).toBeTruthy();
        expect(response.statusCode).toBe(404);
        expect(response._getData()).toContain('NotFoundHttpError');
        resolve();
      });
    });

    await handler.handleSafe({ request, response });
    await endPromise;
  });
});
