import assert from 'assert';
import { parse } from 'url';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { HttpHandler } from '../../../../server/HttpHandler';
import { throwIdpInteractionError } from '../EmailPasswordUtil';
import type { ResetPasswordRenderHandler } from './ResetPasswordRenderHandler';

/**
 * Handles the creation of the Reset Password form
 * after the user clicks on it from the link provided in the email.
 */
export class ResetPasswordViewHandler extends HttpHandler {
  private readonly renderHandler: ResetPasswordRenderHandler;

  public constructor(renderHandler: ResetPasswordRenderHandler) {
    super();
    this.renderHandler = renderHandler;
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    try {
      assert(request.url, 'The request must have a URL');
      const recordId = parse(request.url, true).query.rid;
      assert(
        typeof recordId === 'string' && recordId.length > 0,
        'A forgot password record ID must be provided. Use the link you have received by email.',
      );
      await this.renderHandler.handleSafe({
        response,
        contents: { errorMessage: '', recordId },
      });
    } catch (error: unknown) {
      throwIdpInteractionError(error, {});
    }
  }
}
