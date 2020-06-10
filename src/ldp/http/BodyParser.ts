import { AsyncHandler } from '../../util/AsyncHandler';
import { HttpRequest } from '../../server/HttpRequest';
import { Representation } from '../representation/Representation';

export abstract class BodyParser extends AsyncHandler<HttpRequest, Representation> {}
