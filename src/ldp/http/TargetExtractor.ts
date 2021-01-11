import type { HttpRequest } from '../../server/HttpRequest';
import { AsyncHandler } from '../../util/AsyncHandler';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';

/**
 * Extracts a {@link ResourceIdentifier} from an incoming {@link HttpRequest}.
 */
export abstract class TargetExtractor extends AsyncHandler<{ request: HttpRequest }, ResourceIdentifier> {}
