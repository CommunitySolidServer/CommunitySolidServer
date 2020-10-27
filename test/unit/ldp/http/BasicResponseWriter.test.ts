import { EventEmitter } from 'events';
import type { MockResponse } from 'node-mocks-http';
import { createResponse } from 'node-mocks-http';
import streamifyArray from 'streamify-array';
import { BasicResponseWriter } from '../../../../src/ldp/http/BasicResponseWriter';
import type { ResponseDescription } from '../../../../src/ldp/http/response/ResponseDescription';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A BasicResponseWriter', (): void => {
  const writer = new BasicResponseWriter();
  let response: MockResponse<any>;
  let result: ResponseDescription;

  beforeEach(async(): Promise<void> => {
    response = createResponse({ eventEmitter: EventEmitter });
    result = { statusCode: 201 };
  });

  it('requires the input to be a ResponseDescription.', async(): Promise<void> => {
    await expect(writer.canHandle({ response, result: new Error('error') }))
      .rejects.toThrow(UnsupportedHttpError);
    await expect(writer.canHandle({ response, result }))
      .resolves.toBeUndefined();
  });

  it('responds with the status code of the ResponseDescription.', async(): Promise<void> => {
    await writer.handle({ response, result });
    expect(response._isEndCalled()).toBeTruthy();
    expect(response._getStatusCode()).toBe(201);
  });

  it('responds with a body if the description has a body.', async(): Promise<void> => {
    const data = streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]);
    result = { statusCode: 201, data };

    const end = new Promise((resolve): void => {
      response.on('end', (): void => {
        expect(response._isEndCalled()).toBeTruthy();
        expect(response._getStatusCode()).toBe(201);
        expect(response._getData()).toEqual('<http://test.com/s> <http://test.com/p> <http://test.com/o>.');
        resolve();
      });
    });

    await writer.handle({ response, result });
    await end;
  });
});
