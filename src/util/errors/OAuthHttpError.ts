import type { HttpErrorOptions } from './HttpError';
import { HttpError } from './HttpError';

/**
 * These are the fields that can occur in an OAuth error response as described in RFC 6749, §4.1.2.1.
 * https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
 *
 * This interface is identical to the ErrorOut interface of the `oidc-provider` library,
 * but having our own version reduces the part of the codebase that is dependent on that library.
 */
export interface OAuthErrorFields {
  error: string;
  // eslint-disable-next-line ts/naming-convention
  error_description?: string | undefined;
  scope?: string | undefined;
  state?: string | undefined;
}

/**
 * Represents on OAuth error that is being thrown.
 * OAuth error responses have additional fields that need to be present in the JSON response,
 * as described in RFC 6749, §4.1.2.1.
 */
export class OAuthHttpError extends HttpError {
  public readonly mandatoryFields: OAuthErrorFields;

  public constructor(
    mandatoryFields: OAuthErrorFields,
    name?: string,
    statusCode?: number,
    message?: string,
    options?: HttpErrorOptions,
  ) {
    super(statusCode ?? 500, name ?? 'OAuthHttpError', message, options);
    this.mandatoryFields = mandatoryFields;
  }

  public static isInstance(error: unknown): error is OAuthHttpError {
    return HttpError.isInstance(error) && Boolean((error as OAuthHttpError).mandatoryFields);
  }
}
