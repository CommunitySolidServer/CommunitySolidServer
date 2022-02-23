import { BasicRepresentation } from '../../../../http/representation/BasicRepresentation';
import type { Representation } from '../../../../http/representation/Representation';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { APPLICATION_JSON } from '../../../../util/ContentTypes';
import { readJsonStream } from '../../../../util/StreamUtil';
import { BaseInteractionHandler } from '../../BaseInteractionHandler';
import type { InteractionHandlerInput } from '../../InteractionHandler';
import type { RegistrationManager } from '../util/RegistrationManager';

const registrationView = {
  required: {
    email: 'string',
    password: 'string',
    confirmPassword: 'string',
    createWebId: 'boolean',
    register: 'boolean',
    createPod: 'boolean',
    rootPod: 'boolean',
  },
  optional: {
    webId: 'string',
    podName: 'string',
    template: 'string',
  },
} as const;

/**
 * Supports registration based on the `RegistrationManager` behaviour.
 */
export class RegistrationHandler extends BaseInteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly registrationManager: RegistrationManager;

  public constructor(registrationManager: RegistrationManager) {
    super(registrationView);
    this.registrationManager = registrationManager;
  }

  public async handlePost({ operation }: InteractionHandlerInput): Promise<Representation> {
    const data = await readJsonStream(operation.body.data);
    const validated = this.registrationManager.validateInput(data, false);
    const details = await this.registrationManager.register(validated, false);
    return new BasicRepresentation(JSON.stringify(details), operation.target, APPLICATION_JSON);
  }
}
