import { createRequest, createResponse } from 'node-mocks-http';
import type { HttpHandlerInput, HttpRequest, HttpResponse } from '../../../../src';
import { guardStream, HttpError } from '../../../../src';
import { BasicOnErrorHttpHandler } from '../../../../src/server/util/BasicOnErrorHttpHandler';

describe('BasicOnErrorHttpHandler', (): void => {
  let request: HttpRequest;
  let response: HttpResponse;
  let input: HttpHandlerInput;

  beforeEach(async(): Promise<void> => {
    request = guardStream(createRequest({
      url: '/test',
    }));
    response = createResponse();
    input = {
      request,
      response,
    };
  });

  it('returns a stack if the error is an HttpError.', async(): Promise<void> => {
    const handler = new BasicOnErrorHttpHandler();
    await handler.handle({ error: new HttpError(405, 'cool error:'), input });
    const testResponse = response as any;
    expect(testResponse._isEndCalled()).toBe(true);
    expect(testResponse._getData()).toMatch('cool error:');
    expect(testResponse._getStatusCode()).toBe(405);
  });

  it('returns a stack if the error is a regular Error.', async(): Promise<void> => {
    const handler = new BasicOnErrorHttpHandler();
    await handler.handle({ error: new Error('cool error'), input });
    const testResponse = response as any;
    expect(testResponse._isEndCalled()).toBe(true);
    expect(testResponse._getData()).toMatch('Error: cool error');
    expect(testResponse._getStatusCode()).toBe(500);
  });

  it('returns a message if the error is something other than an error.', async(): Promise<void> => {
    const handler = new BasicOnErrorHttpHandler();
    await handler.handle({ error: 'Just a string', input });
    const testResponse = response as any;
    expect(testResponse._isEndCalled()).toBe(true);
    expect(testResponse._getData()).toBe('Error');
    expect(testResponse._getStatusCode()).toBe(500);
  });
});
