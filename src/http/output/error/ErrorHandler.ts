import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { RepresentationPreferences } from '../../representation/RepresentationPreferences';
import type { ResponseDescription } from '../response/ResponseDescription';

export interface ErrorHandlerArgs {
  error: Error;
  preferences: RepresentationPreferences;
}

/**
 * Converts an error into a {@link ResponseDescription} based on the request preferences.
 */
export abstract class ErrorHandler extends AsyncHandler<ErrorHandlerArgs, ResponseDescription> {}
