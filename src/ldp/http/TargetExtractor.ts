import { HttpRequest } from '../../server/HttpRequest';
import { AsyncHandler } from '../../util/AsyncHandler';
import { ResourceIdentifier } from '../representation/ResourceIdentifier';

/**
 * Extracts a {@link ResourceIdentifier} from an incoming {@link HttpRequest}.
 */
export abstract class TargetExtractor extends AsyncHandler<HttpRequest, ResourceIdentifier> {}
