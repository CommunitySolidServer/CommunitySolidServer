import type { ResourceIdentifier } from '../../../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { PodSettings } from '../../settings/PodSettings';

/**
 * Updates the variables stored in the given agent.
 * Can be used to set variables that are required for the Components.js instantiation
 * but which should not be provided by the request.
 * E.g.: The exact file path (when required) should be determined by the server to prevent abuse.
 */
export abstract class VariableHandler extends AsyncHandler<{ identifier: ResourceIdentifier; settings: PodSettings }> {}
