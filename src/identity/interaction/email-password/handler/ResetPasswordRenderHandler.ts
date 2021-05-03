import { RenderHandler } from '../../../../server/util/RenderHandler';

export interface ResetPasswordRenderHandlerProps {
  errorMessage: string;
  recordId: string;
}

/**
 * A special {@link RenderHandler} for the Reset Password form
 * that includes the required props for rendering the reset password form.
 */
export abstract class ResetPasswordRenderHandler extends RenderHandler<ResetPasswordRenderHandlerProps> {}
