import assert from 'assert';
import { parse } from 'url';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { HttpHandler } from '../../../../server/HttpHandler';
import { throwIdpInteractionError } from '../EmailPasswordUtil';
import type { EmailPasswordResetPasswordRenderHandler } from './EmailPasswordResetPasswordRenderHandler';

/**
 * Handles the creation of the Reset Password form after
 * the user clicks on it from the link provided in the email.
 */
export class EmailPasswordGetResetPasswordHandler extends HttpHandler {
  private readonly renderHandler: EmailPasswordResetPasswordRenderHandler;

  public constructor(renderHandler: EmailPasswordResetPasswordRenderHandler) {
    super();
    this.renderHandler = renderHandler;
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    try {
      assert(request.url, 'The request must have a url');
      const recordId = parse(request.url, true).query.rid;
      assert(
        recordId && typeof recordId === 'string',
        'A forgot password record id must be provided. Use the link from your email.',
      );
      await this.renderHandler.handleSafe({
        response,
        props: { errorMessage: '', recordId },
      });
    } catch (error: unknown) {
      throwIdpInteractionError(error, {});
    }
  }
}
