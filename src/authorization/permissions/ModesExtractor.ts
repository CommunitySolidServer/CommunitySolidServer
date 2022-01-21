import type { Operation } from '../../http/Operation';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { AccessMode } from './Permissions';

/**
 * Extracts all {@link AccessMode}s that are necessary to execute the given {@link Operation}.
 */
export abstract class ModesExtractor extends AsyncHandler<Operation, Set<AccessMode>> {}
