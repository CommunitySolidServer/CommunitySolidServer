import { EventEmitter } from 'events';
import type { MockResponse } from 'node-mocks-http';
import { createResponse } from 'node-mocks-http';
import { ErrorResponseWriter } from '../../../../src/ldp/http/ErrorResponseWriter';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('An ErrorResponseWriter', (): void => {
  const writer = new ErrorResponseWriter();
  let response: MockResponse<any>;

  beforeEach(async(): Promise<void> => {
    response = createResponse({ eventEmitter: EventEmitter });
  });

  it('requires the input to be an error.', async(): Promise<void> => {
    await expect(writer.canHandle({ response, result: new Error('error') }))
      .resolves.toBeUndefined();
    await expect(writer.canHandle({ response, result: { statusCode: 200 }}))
      .rejects.toThrow(UnsupportedHttpError);
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

  it('ends its response with a newline if there is an error.', async(): Promise<void> => {
    await writer.handle({ response, result: new Error('error') });
    expect(response._isEndCalled()).toBeTruthy();
    expect(response._getData().endsWith('\n')).toBeTruthy();
  });
});
