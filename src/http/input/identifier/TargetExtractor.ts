import { AsyncHandler } from 'asynchronous-handlers';
import type { HttpRequest } from '../../../server/HttpRequest';
import type { ResourceIdentifier } from '../../representation/ResourceIdentifier';

/**
 * Extracts a {@link ResourceIdentifier} from an incoming {@link HttpRequest}.
 */
export abstract class TargetExtractor extends AsyncHandler<{ request: HttpRequest }, ResourceIdentifier> {}
