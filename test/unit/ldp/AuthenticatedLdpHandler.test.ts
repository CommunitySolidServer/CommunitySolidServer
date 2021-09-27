import type { CredentialSet } from '../../../src/authentication/Credentials';
import type { Authorization } from '../../../src/authorization/Authorization';
import type { AuthenticatedLdpHandlerArgs } from '../../../src/ldp/AuthenticatedLdpHandler';
import { AuthenticatedLdpHandler } from '../../../src/ldp/AuthenticatedLdpHandler';
import { ResetResponseDescription } from '../../../src/ldp/http/response/ResetResponseDescription';
import type { ResponseDescription } from '../../../src/ldp/http/response/ResponseDescription';
import type { Operation } from '../../../src/ldp/operations/Operation';
import { AccessMode } from '../../../src/ldp/permissions/PermissionSet';
import type { RepresentationPreferences } from '../../../src/ldp/representation/RepresentationPreferences';
import * as LogUtil from '../../../src/logging/LogUtil';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';

describe('An AuthenticatedLdpHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  const preferences: RepresentationPreferences = { type: { 'text/turtle': 0.9 }};
  let operation: Operation;
  const credentials: CredentialSet = {};
  const modes: Set<AccessMode> = new Set([ AccessMode.read ]);
  const authorization: Authorization = { addMetadata: jest.fn() };
  const result: ResponseDescription = new ResetResponseDescription();
  const errorResult: ResponseDescription = { statusCode: 500 };
  let args: AuthenticatedLdpHandlerArgs;
  let handler: AuthenticatedLdpHandler;

  beforeEach(async(): Promise<void> => {
    operation = { target: { path: 'identifier' }, method: 'GET', preferences };
    args = {
      requestParser: {
        canHandle: jest.fn(),
        handleSafe: jest.fn().mockResolvedValue(operation),
      } as any,
      credentialsExtractor: { handleSafe: jest.fn().mockResolvedValue(credentials) } as any,
      modesExtractor: { handleSafe: jest.fn().mockResolvedValue(modes) } as any,
      authorizer: { handleSafe: jest.fn().mockResolvedValue(authorization) } as any,
      operationHandler: { handleSafe: jest.fn().mockResolvedValue(result) } as any,
      errorHandler: { handleSafe: jest.fn().mockResolvedValue(errorResult) } as any,
      responseWriter: { handleSafe: jest.fn() } as any,
    };
    handler = new AuthenticatedLdpHandler(args);
  });

  it('can be created.', async(): Promise<void> => {
    expect(new AuthenticatedLdpHandler(args)).toBeInstanceOf(AuthenticatedLdpHandler);
  });

  it('can not handle the input if the RequestParser rejects it.', async(): Promise<void> => {
    (args.requestParser.canHandle as jest.Mock).mockRejectedValueOnce(new Error('bad data!'));
    await expect(handler.canHandle({ request, response })).rejects.toThrow('bad data!');
    expect(args.requestParser.canHandle).toHaveBeenLastCalledWith(request);
  });

  it('can handle the input if the RequestParser can handle it.', async(): Promise<void> => {
    await expect(handler.canHandle({ request, response })).resolves.toBeUndefined();
    expect(args.requestParser.canHandle).toHaveBeenCalledTimes(1);
    expect(args.requestParser.canHandle).toHaveBeenLastCalledWith(request);
  });

  it('can handle input.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(args.requestParser.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.requestParser.handleSafe).toHaveBeenLastCalledWith(request);
    expect(args.credentialsExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.credentialsExtractor.handleSafe).toHaveBeenLastCalledWith(request);
    expect(args.modesExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.modesExtractor.handleSafe).toHaveBeenLastCalledWith(operation);
    expect(args.authorizer.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.authorizer.handleSafe)
      .toHaveBeenLastCalledWith({ credentials, identifier: { path: 'identifier' }, modes });
    expect(operation.authorization).toBe(authorization);
    expect(args.operationHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.operationHandler.handleSafe).toHaveBeenLastCalledWith(operation);
    expect(args.errorHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(args.responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result });
  });

  it('sets preferences to text/plain in case of an error during request parsing.', async(): Promise<void> => {
    const error = new Error('bad request!');
    (args.requestParser.handleSafe as jest.Mock).mockRejectedValueOnce(new Error('bad request!'));

    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(args.requestParser.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.credentialsExtractor.handleSafe).toHaveBeenCalledTimes(0);
    expect(args.errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, preferences: { type: { 'text/plain': 1 }}});
    expect(args.responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: errorResult });
  });

  it('sets preferences to the request preferences if they were parsed before the error.', async(): Promise<void> => {
    const error = new Error('bad request!');
    (args.credentialsExtractor.handleSafe as jest.Mock).mockRejectedValueOnce(new Error('bad request!'));

    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(args.requestParser.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.credentialsExtractor.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.authorizer.handleSafe).toHaveBeenCalledTimes(0);
    expect(args.errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.errorHandler.handleSafe).toHaveBeenLastCalledWith({ error, preferences });
    expect(args.responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(args.responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: errorResult });
  });

  it('logs an error if authorization failed.', async(): Promise<void> => {
    const logger = { verbose: jest.fn() };
    const mock = jest.spyOn(LogUtil, 'getLoggerFor');
    mock.mockReturnValueOnce(logger as any);
    handler = new AuthenticatedLdpHandler(args);
    (args.authorizer.handleSafe as jest.Mock).mockRejectedValueOnce(new Error('bad auth!'));
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(logger.verbose).toHaveBeenLastCalledWith('Authorization failed: bad auth!');

    mock.mockRestore();
  });
});
