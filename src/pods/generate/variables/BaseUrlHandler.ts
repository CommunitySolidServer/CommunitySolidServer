import type { ResourceIdentifier } from '../../../http/representation/ResourceIdentifier';
import type { PodSettings } from '../../settings/PodSettings';
import { VariableHandler } from './VariableHandler';
import { TEMPLATE_VARIABLE } from './Variables';

/**
 * Adds the pod identifier as base url variable to the agent.
 * This allows for config templates that require a value for TEMPLATE_BASE_URL_URN,
 * which should equal the pod identifier.
 */
export class BaseUrlHandler extends VariableHandler {
  public async handle({ identifier, settings }: { identifier: ResourceIdentifier; settings: PodSettings }):
  Promise<void> {
    settings[TEMPLATE_VARIABLE.baseUrl] = identifier.path;
  }
}
