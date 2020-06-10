import { AsyncHandler } from '../../util/AsyncHandler';
import { HttpRequest } from '../../server/HttpRequest';
import { ResourceIdentifier } from '../representation/ResourceIdentifier';

export abstract class TargetExtractor extends AsyncHandler<HttpRequest, ResourceIdentifier> {}
