import { AsyncHandler } from '../../util/AsyncHandler';
import { HttpRequest } from '../../server/HttpRequest';
import { RepresentationPreferences } from '../representation/RepresentationPreferences';

export abstract class PreferenceParser extends AsyncHandler<HttpRequest, RepresentationPreferences> {}
