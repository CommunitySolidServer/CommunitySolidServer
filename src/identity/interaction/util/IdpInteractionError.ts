import { HttpError } from '../../../util/errors/HttpError';

/**
 * An error made for IDP Interactions. It allows a function to set the prefilled
 * information that would be included in a response UI render.
 */
export class IdpInteractionError extends HttpError {
  public readonly prefilled: Record<string, string>;

  public constructor(status: number, message: string, prefilled: Record<string, string>) {
    super(status, 'IdpInteractionError', message);
    this.prefilled = prefilled;
  }

  public static isInstance(error: unknown): error is IdpInteractionError {
    return HttpError.isInstance(error) && typeof (error as any).prefilled === 'object';
  }
}
