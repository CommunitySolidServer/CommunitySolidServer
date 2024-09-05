import { AsyncHandler } from 'asynchronous-handlers';
import type { Operation } from '../../http/Operation';
import type { AccessMap } from './Permissions';

/**
 * Extracts all {@link AccessMode}s that are necessary to execute the given {@link Operation}.
 */
export abstract class ModesExtractor extends AsyncHandler<Operation, AccessMap> {}
