import assert from 'assert';
import { parse } from 'url';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { HttpHandler } from '../../../../server/HttpHandler';
import type { RenderHandler } from '../../../../server/util/RenderHandler';
import type { EmailPasswordResetPasswordRenderHandler } from './EmailPasswordResetPasswordRenderHandler';

export class EmailPasswordGetResetPasswordHandler extends HttpHandler {
  private readonly renderHandler: RenderHandler<{
    errorMessage: string;
    recordId: string;
  }>;

  private readonly logger = getLoggerFor(this);

  public constructor(
    renderHandler: EmailPasswordResetPasswordRenderHandler,
  ) {
    super();
    this.renderHandler = renderHandler;
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    assert(input.request.url, 'The request must have a url');
    const recordId = parse(input.request.url, true).query.rid;
    assert(
      recordId && typeof recordId === 'string',
      'A forgot password record id must be provided. Use the link from your email.',
    );
    await this.renderHandler.handle({
      response: input.response,
      props: {
        errorMessage: '',
        recordId,
      },
    });
  }
}
