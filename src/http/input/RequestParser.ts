import type { HttpRequest } from '../../server/HttpRequest';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { Operation } from '../Operation';
import type { RepresentationPreferences } from '../representation/RepresentationPreferences';

export interface RequestParserInput {
  request: HttpRequest;
  preferences: RepresentationPreferences;
}

/**
 * Converts an incoming HttpRequest to an Operation.
 * Preferences should already have been parsed and passed along.
 */
export abstract class RequestParser extends AsyncHandler<RequestParserInput, Operation> {}
