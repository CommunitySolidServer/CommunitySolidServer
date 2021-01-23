import { RenderHandler } from '../../../../server/util/RenderHandler';

export interface EmailPasswordResetPasswordRenderHandlerProps {
  errorMessage: string;
  recordId: string;
}

export abstract class EmailPasswordResetPasswordRenderHandler
  extends RenderHandler<EmailPasswordResetPasswordRenderHandlerProps> {}
