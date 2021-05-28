import { getLoggerFor } from '../../logging/LogUtil';
import { OwnershipValidator } from './OwnershipValidator';

/**
 * Does not do any checks to verify if the agent doing the request is actually the owner of the WebID.
 * This should only be used for debugging.
 */
export class NoCheckOwnershipValidator extends OwnershipValidator {
  protected readonly logger = getLoggerFor(this);

  public async handle({ webId }: { webId: string }): Promise<void> {
    this.logger.info(`Agent unsecurely claims to own ${webId}`);
  }
}
