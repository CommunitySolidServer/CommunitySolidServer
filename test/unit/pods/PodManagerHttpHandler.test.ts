import type { RequestParser } from '../../../src/ldp/http/RequestParser';
import { CreatedResponseDescription } from '../../../src/ldp/http/response/CreatedResponseDescription';
import type { ResponseWriter } from '../../../src/ldp/http/ResponseWriter';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { PodManager } from '../../../src/pods/PodManager';
import { PodManagerHttpHandler } from '../../../src/pods/PodManagerHttpHandler';
import type { PodSettingsParser } from '../../../src/pods/settings/PodSettingsParser';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import { StaticAsyncHandler } from '../../util/StaticAsyncHandler';

describe('A PodManagerHttpHandler', (): void => {
  const requestPath = '/pods';
  let requestParser: RequestParser;
  let podSettingsParser: PodSettingsParser;
  let manager: PodManager;
  let responseWriter: ResponseWriter;
  let handler: PodManagerHttpHandler;

  beforeEach(async(): Promise<void> => {
    requestParser = { handleSafe: jest.fn((): any => 'requestParser') } as any;
    podSettingsParser = new StaticAsyncHandler(true, 'podSettingsParser' as any);
    manager = {
      createPod: jest.fn(),
    };
    responseWriter = { handleSafe: jest.fn((): any => 'response') } as any;
    handler = new PodManagerHttpHandler({ requestPath, requestParser, podSettingsParser, manager, responseWriter });
  });

  it('only supports requests to /pods.', async(): Promise<void> => {
    const call = handler.canHandle({ request: { url: '/notPods' } as HttpRequest });
    await expect(call).rejects.toThrow('Only requests to /pods are accepted');
    await expect(call).rejects.toThrow(NotImplementedHttpError);
    await expect(handler.canHandle({ request: { url: '/pods' } as HttpRequest })).resolves.toBeUndefined();
  });

  it('writes an error if the request was no POST.', async(): Promise<void> => {
    const response = {} as HttpResponse;
    await expect(handler.handle({ request: { method: 'GET' } as HttpRequest, response })).resolves.toBeUndefined();
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const mockCall = (responseWriter.handleSafe as jest.Mock).mock.calls[0][0];
    expect(mockCall).toEqual({ response, result: expect.any(NotImplementedHttpError) });
    expect(mockCall.result.message).toBe('Only POST requests are supported');
  });

  it('writes an error if there is no input body.', async(): Promise<void> => {
    const response = {} as HttpResponse;
    await expect(handler.handle({ request: { method: 'POST' } as HttpRequest, response })).resolves.toBeUndefined();
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const mockCall = (responseWriter.handleSafe as jest.Mock).mock.calls[0][0];
    expect(mockCall).toEqual({ response, result: expect.any(BadRequestHttpError) });
    expect(mockCall.result.message).toBe('A body is required to create a pod');
  });

  it('writes an internal error if a non-error was thrown.', async(): Promise<void> => {
    const response = {} as HttpResponse;
    (requestParser.handleSafe as jest.Mock).mockImplementationOnce((): any => {
      throw 'apple';
    });
    await expect(handler.handle({ request: { method: 'POST' } as HttpRequest, response })).resolves.toBeUndefined();
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    const mockCall = (responseWriter.handleSafe as jest.Mock).mock.calls[0][0];
    expect(mockCall).toEqual({ response, result: expect.any(InternalServerError) });
    expect(mockCall.result.message).toBe('Unexpected error');
  });

  it('returns the id of the created pod on success.', async(): Promise<void> => {
    const response = {} as HttpResponse;
    (manager.createPod as jest.Mock).mockImplementationOnce((): ResourceIdentifier => ({ path: '/pad/to/pod/' }));
    (requestParser.handleSafe as jest.Mock).mockImplementationOnce((): any => ({ body: 'data' }));
    await expect(handler.handle({ request: { method: 'POST' } as HttpRequest, response })).resolves.toBeUndefined();
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith(
      { response, result: new CreatedResponseDescription({ path: '/pad/to/pod/' }) },
    );
  });
});
