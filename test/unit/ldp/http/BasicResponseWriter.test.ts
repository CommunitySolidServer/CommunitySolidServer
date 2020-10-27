import { EventEmitter } from 'events';
import type { MockResponse } from 'node-mocks-http';
import { createResponse } from 'node-mocks-http';
import streamifyArray from 'streamify-array';
import { BasicResponseWriter } from '../../../../src/ldp/http/BasicResponseWriter';
import type { ResponseDescription } from '../../../../src/ldp/operations/ResponseDescription';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';
import { CONTENT_TYPE } from '../../../../src/util/UriConstants';

describe('A BasicResponseWriter', (): void => {
  const writer = new BasicResponseWriter();
  let response: MockResponse<any>;

  beforeEach(async(): Promise<void> => {
    response = createResponse({ eventEmitter: EventEmitter });
  });

  it('requires the description body to be a string or binary stream if present.', async(): Promise<void> => {
    await expect(writer.canHandle({ response, result: { body: { binary: false }} as ResponseDescription }))
      .rejects.toThrow(UnsupportedHttpError);
    await expect(writer.canHandle({ response, result: { body: { binary: true }} as ResponseDescription }))
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
      binary: true,
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]),
      metadata: new RepresentationMetadata(),
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
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
    const body = {
      binary: true,
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]),
      metadata,
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

  it('responds with the error name and message when no stack trace is lazily generated.', async(): Promise<void> => {
    const error = new Error('error');
    error.stack = undefined;
    await writer.handle({ response, result: error });
    expect(response._isEndCalled()).toBeTruthy();
    expect(response._getStatusCode()).toBe(500);
    expect(response._getData()).toMatch('Error: error');
  });
});
