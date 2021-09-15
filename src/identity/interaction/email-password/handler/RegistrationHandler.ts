import { getLoggerFor } from '../../../../logging/LogUtil';
import { readJsonStream } from '../../../../util/StreamUtil';
import type { RegistrationManager, RegistrationResponse } from '../util/RegistrationManager';
import type { InteractionResponseResult, InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';

/**
 * Supports registration based on the `RegistrationManager` behaviour.
 */
export class RegistrationHandler extends InteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly registrationManager: RegistrationManager;

  public constructor(registrationManager: RegistrationManager) {
    super();
    this.registrationManager = registrationManager;
  }

  public async handle({ operation }: InteractionHandlerInput):
  Promise<InteractionResponseResult<RegistrationResponse>> {
    const data = await readJsonStream(operation.body!.data);
    const validated = this.registrationManager.validateInput(data, false);
    const details = await this.registrationManager.register(validated, false);
    return { type: 'response', details };
  }
}
