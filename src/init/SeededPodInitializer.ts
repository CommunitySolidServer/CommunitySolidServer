import { readJson } from 'fs-extra';
import type { RegistrationManager } from '../identity/interaction/email-password/util/RegistrationManager';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { Initializer } from './Initializer';

/**
 * Uses a {@link RegistrationManager} to initialize accounts and pods
 * for all seeded pods. Reads the pod settings from seededPodConfigJson.
 */
export class SeededPodInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);

  private readonly registrationManager: RegistrationManager;
  private readonly configFilePath: string | null;

  public constructor(registrationManager: RegistrationManager, configFilePath: string | null) {
    super();
    this.registrationManager = registrationManager;
    this.configFilePath = configFilePath;
  }

  public async handle(): Promise<void> {
    if (!this.configFilePath) {
      return;
    }
    const configuration = await readJson(this.configFilePath, 'utf8');

    let count = 0;
    for await (const input of configuration) {
      const config = {
        confirmPassword: input.password,
        createPod: true,
        createWebId: true,
        register: true,
        ...input,
      };

      this.logger.info(`Initializing pod ${input.podName}`);

      // Validate the input JSON
      const validated = this.registrationManager.validateInput(config, true);
      this.logger.debug(`Validated input: ${JSON.stringify(validated)}`);

      // Register and/or create a pod as requested. Potentially does nothing if all booleans are false.
      try {
        await this.registrationManager.register(validated, true);
        this.logger.info(`Initialized seeded pod and account for "${input.podName}".`);
        count += 1;
      } catch (error: unknown) {
        this.logger.warn(`Error while initializing seeded pod: ${createErrorMessage(error)})}`);
      }
    }

    this.logger.info(`Initialized ${count} seeded pods.`);
  }
}
