import type { HttpRequest } from '../../server/HttpRequest';
import { AsyncHandler } from '../../util/AsyncHandler';
import type { Representation } from '../representation/Representation';

/**
 * Parses the body of an incoming {@link HttpRequest} and converts it to a {@link Representation}.
 */
export abstract class BodyParser extends AsyncHandler<HttpRequest, Representation | undefined> {}
