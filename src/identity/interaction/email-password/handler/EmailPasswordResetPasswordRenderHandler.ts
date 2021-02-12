import { RenderHandler } from '../../../../server/util/RenderHandler';

export interface EmailPasswordResetPasswordRenderHandlerProps {
  errorMessage: string;
  recordId: string;
}

/**
 * A special render handler for the Reset Password form that
 * includes the required props for rendering the reset password
 * form.
 */
export abstract class EmailPasswordResetPasswordRenderHandler
  extends RenderHandler<EmailPasswordResetPasswordRenderHandlerProps> {}
