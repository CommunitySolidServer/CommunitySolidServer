import type {
  ResetPasswordRenderHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/ResetPasswordRenderHandler';
import {
  ResetPasswordViewHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/ResetPasswordViewHandler';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';

describe('A ResetPasswordViewHandler', (): void => {
  let request: HttpRequest;
  const response: HttpResponse = {} as any;
  let renderHandler: ResetPasswordRenderHandler;
  let handler: ResetPasswordViewHandler;

  beforeEach(async(): Promise<void> => {
    request = {} as any;

    renderHandler = {
      handleSafe: jest.fn(),
    } as any;

    handler = new ResetPasswordViewHandler(renderHandler);
  });

  it('requires a URL.', async(): Promise<void> => {
    await expect(handler.handle({ request, response })).rejects.toThrow('The request must have a URL');
  });

  it('requires a record ID.', async(): Promise<void> => {
    request.url = '/foo';
    await expect(handler.handle({ request, response })).rejects
      .toThrow('A forgot password record ID must be provided. Use the link you have received by email.');
    request.url = '/foo?wrong=recordId';
    await expect(handler.handle({ request, response })).rejects
      .toThrow('A forgot password record ID must be provided. Use the link you have received by email.');
  });

  it('renders the response.', async(): Promise<void> => {
    request.url = '/foo?rid=recordId';
    await expect(handler.handle({ request, response })).resolves.toBeUndefined();
    expect(renderHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(renderHandler.handleSafe).toHaveBeenLastCalledWith({
      response,
      contents: { errorMessage: '', recordId: 'recordId' },
    });
  });
});
