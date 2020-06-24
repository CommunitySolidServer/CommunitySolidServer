import { AsyncHandler } from '../../util/AsyncHandler';
import { HttpRequest } from '../../server/HttpRequest';
import { RepresentationPreferences } from '../representation/RepresentationPreferences';

/**
 * Creates {@link RepresentationPreferences} based on the incoming HTTP headers in a {@link HttpRequest}.
 */
export abstract class PreferenceParser extends AsyncHandler<HttpRequest, RepresentationPreferences> {}
