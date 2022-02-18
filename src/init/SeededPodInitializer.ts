import type { RegistrationManager } from '../identity/interaction/email-password/util/RegistrationManager';
import { getLoggerFor } from '../logging/LogUtil';
import type { KeyValueStorage } from '../storage/keyvalue/KeyValueStorage';
import { Initializer } from './Initializer';

export interface SeederPodInitializerArgs {
  /**
   * Used for registering seeded pods.
   */
  registrationManager: RegistrationManager;
  /**
   * Settings that the seeded Pods should be created with.
   */
  configStorage: KeyValueStorage<string, unknown>;
}

/**
 * Uses a {@link RegistrationManager} to initializes accounts and pods
 * for all seeded pods. Reads the pod settings from seededPodConfigJson.
 */
export class SeededPodInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);

  private readonly registrationManager: RegistrationManager;
  private readonly configStorage: KeyValueStorage<string, unknown>;

  public constructor(args: SeederPodInitializerArgs) {
    super();
    this.registrationManager = args.registrationManager;
    this.configStorage = args.configStorage;
  }

  public async handle(): Promise<void> {
    let count = 0;
    for await (const [ , value ] of this.configStorage.entries()) {
      const config = value as NodeJS.Dict<unknown>;
      config.confirmPassword = config.password;
      config.createPod = true;
      config.createWebId = true;
      config.register = true;

      this.logger.info(`Initializing pod ${config.podName}`);

      // Validate the input JSON
      const validated = this.registrationManager.validateInput(config, true);
      this.logger.debug(`Validated input: ${JSON.stringify(validated)}`);

      // Register and/or create a pod as requested. Potentially does nothing if all booleans are false.
      await this.registrationManager.register(validated, true);
      this.logger.info(`Initialized seeded pod and account for "${config.podName}".`);
      count += 1;
    }
    this.logger.info(`Initialized ${count} seeded pods.`);
  }
}
