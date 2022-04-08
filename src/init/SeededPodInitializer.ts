import { promises as fsPromises } from 'fs';
import type { RegistrationManager } from '../identity/interaction/email-password/util/RegistrationManager';
import { getLoggerFor } from '../logging/LogUtil';
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
    const configText = await fsPromises.readFile(this.configFilePath, 'utf8');
    const configuration: NodeJS.Dict<unknown>[] = JSON.parse(configText);

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
      await this.registrationManager.register(validated, true);
      this.logger.info(`Initialized seeded pod and account for "${input.podName}".`);
      count += 1;
    }
    this.logger.info(`Initialized ${count} seeded pods.`);
  }
}
