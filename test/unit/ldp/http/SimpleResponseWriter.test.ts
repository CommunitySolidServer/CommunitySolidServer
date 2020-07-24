import { EventEmitter } from 'events';
import { Quad } from 'rdf-js';
import { ResponseDescription } from '../../../../src/ldp/operations/ResponseDescription';
import { SimpleResponseWriter } from '../../../../src/ldp/http/SimpleResponseWriter';
import streamifyArray from 'streamify-array';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';
import { createResponse, MockResponse } from 'node-mocks-http';

describe('A SimpleResponseWriter', (): void => {
  const writer = new SimpleResponseWriter();
  let response: MockResponse<any>;

  beforeEach(async(): Promise<void> => {
    response = createResponse({ eventEmitter: EventEmitter });
  });

  it('requires the description body to be a string or binary stream if present.', async(): Promise<void> => {
    await expect(writer.canHandle({ response, result: { body: { dataType: 'quad' }} as ResponseDescription }))
      .rejects.toThrow(UnsupportedHttpError);
    await expect(writer.canHandle({ response, result: { body: { dataType: 'string' }} as ResponseDescription }))
      .resolves.toBeUndefined();
    await expect(writer.canHandle({ response, result: { body: { dataType: 'binary' }} as ResponseDescription }))
      .resolves.toBeUndefined();
  });

  it('responds with status code 200 and a location header if there is a description.', async(): Promise<void> => {
    await writer.handle({ response, result: { identifier: { path: 'path' }}});
    expect(response._isEndCalled()).toBeTruthy();
    expect(response._getStatusCode()).toBe(200);
    expect(response._getHeaders()).toMatchObject({ location: 'path' });
  });

  it('responds with a body if the description has a body.', async(done): Promise<void> => {
    const body = {
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]),
      dataType: 'binary',
      metadata: {
        raw: [] as Quad[],
        profiles: [] as string[],
      },
    };

    response.on('end', (): void => {
      expect(response._isEndCalled()).toBeTruthy();
      expect(response._getStatusCode()).toBe(200);
      expect(response._getHeaders()).toMatchObject({ location: 'path' });
      expect(response._getData()).toEqual('<http://test.com/s> <http://test.com/p> <http://test.com/o>.');
      done();
    });

    await writer.handle({ response, result: { identifier: { path: 'path' }, body }});
  });

  it('responds with a content-type if the metadata has it.', async(done): Promise<void> => {
    const body = {
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]),
      dataType: 'binary',
      metadata: {
        raw: [] as Quad[],
        profiles: [] as string[],
        contentType: 'text/turtle',
      },
    };

    response.on('end', (): void => {
      expect(response._isEndCalled()).toBeTruthy();
      expect(response._getStatusCode()).toBe(200);
      expect(response._getHeaders()).toMatchObject({ location: 'path', 'content-type': 'text/turtle' });
      expect(response._getData()).toEqual('<http://test.com/s> <http://test.com/p> <http://test.com/o>.');
      done();
    });

    await writer.handle({ response, result: { identifier: { path: 'path' }, body }});
  });

  it('responds with 500 if an error if there is an error.', async(): Promise<void> => {
    await writer.handle({ response, result: new Error('error') });
    expect(response._isEndCalled()).toBeTruthy();
    expect(response._getStatusCode()).toBe(500);
    expect(response._getData()).toMatch('Error: error');
  });

  it('responds with the given statuscode if there is an HttpError.', async(): Promise<void> => {
    const error = new UnsupportedHttpError('error');
    await writer.handle({ response, result: error });
    expect(response._isEndCalled()).toBeTruthy();
    expect(response._getStatusCode()).toBe(error.statusCode);
    expect(response._getData()).toMatch('UnsupportedHttpError: error');
  });
});
