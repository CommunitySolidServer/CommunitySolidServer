import { Authorizer } from '../../../src/authorization/Authorizer';
import { CredentialsExtractor } from '../../../src/authentication/CredentialsExtractor';
import { OperationHandler } from '../../../src/ldp/operations/OperationHandler';
import { PermissionsExtractor } from '../../../src/ldp/permissions/PermissionsExtractor';
import { RequestParser } from '../../../src/ldp/http/RequestParser';
import { ResponseWriter } from '../../../src/ldp/http/ResponseWriter';
import { StaticAsyncHandler } from '../../util/StaticAsyncHandler';
import { AuthenticatedLdpHandler, AuthenticatedLdpHandlerArgs } from '../../../src/ldp/AuthenticatedLdpHandler';

describe('An AuthenticatedLdpHandler', (): void => {
  let args: AuthenticatedLdpHandlerArgs;
  let responseFn: jest.Mock<Promise<void>, [any]>;

  beforeEach(async (): Promise<void> => {
    const requestParser: RequestParser = new StaticAsyncHandler(true, 'parser' as any);
    const credentialsExtractor: CredentialsExtractor = new StaticAsyncHandler(true, 'credentials' as any);
    const permissionsExtractor: PermissionsExtractor = new StaticAsyncHandler(true, 'permissions' as any);
    const authorizer: Authorizer = new StaticAsyncHandler(true, 'authorizer' as any);
    const operationHandler: OperationHandler = new StaticAsyncHandler(true, 'operation' as any);
    const responseWriter: ResponseWriter = new StaticAsyncHandler(true, 'response' as any);

    responseFn = jest.fn(async (input: any): Promise<void> => {
      if (!input) {
        throw new Error('error');
      }
    });
    responseWriter.canHandle = responseFn;

    args = { requestParser, credentialsExtractor, permissionsExtractor, authorizer, operationHandler, responseWriter };
  });

  it('can be created.', async (): Promise<void> => {
    expect(new AuthenticatedLdpHandler(args)).toBeInstanceOf(AuthenticatedLdpHandler);
  });

  it('can check if it handles input.', async (): Promise<void> => {
    const handler = new AuthenticatedLdpHandler(args);

    await expect(handler.canHandle({ request: null, response: null })).resolves.toBeUndefined();
  });

  it('can handle input.', async (): Promise<void> => {
    const handler = new AuthenticatedLdpHandler(args);

    await expect(handler.handle({ request: 'request' as any, response: 'response' as any })).resolves.toEqual('response');
    expect(responseFn).toHaveBeenCalledTimes(1);
    expect(responseFn).toHaveBeenLastCalledWith({ response: 'response', operation: 'parser' as any });
  });

  it('sends an error to the output if a handler does not support the input.', async (): Promise<void> => {
    args.requestParser = new StaticAsyncHandler(false, null);
    const handler = new AuthenticatedLdpHandler(args);

    await expect(handler.handle({ request: 'request' as any, response: null })).resolves.toEqual('response');
    expect(responseFn).toHaveBeenCalledTimes(1);
    expect(responseFn.mock.calls[0][0].error).toBeInstanceOf(Error);
  });

  it('errors if the response writer does not support the result.', async (): Promise< void> => {
    args.responseWriter = new StaticAsyncHandler(false, null);
    const handler = new AuthenticatedLdpHandler(args);

    await expect(handler.handle({ request: 'request' as any, response: null })).rejects.toThrow(Error);
  });
});
