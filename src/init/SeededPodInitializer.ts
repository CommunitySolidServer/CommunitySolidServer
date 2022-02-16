import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { AccountSettings, AccountStore } from '../identity/interaction/email-password/storage/AccountStore';
import { getLoggerFor } from '../logging/LogUtil';
import type { IdentifierGenerator } from '../pods/generate/IdentifierGenerator';
import type { PodManager } from '../pods/PodManager';
import type { PodSettings } from '../pods/settings/PodSettings';
import type { KeyValueStorage } from '../storage/keyvalue/KeyValueStorage';
import { joinUrl } from '../util/PathUtil';
import { Initializer } from './Initializer';

export interface SeederPodInitializerArgs {
  /**
   * Base URL of the server.
   */
  baseUrl: string;
  /**
   * Appended to the generated pod identifier to create the corresponding WebID.
   */
  webIdSuffix: string;
  /**
   * Generates identifiers for new pods.
   */
  identifierGenerator: IdentifierGenerator;
  /**
   * Stores all the registered account information.
   */
  accountStore: AccountStore;
  /**
   * Settings that this Pod should be created with.
   */
  configStorage: KeyValueStorage<string, unknown>;
  /**
   * Creates the new pods.
   */
  podManager: PodManager;
}

/**
 * Initializes accounts and pods for all seeded pods.
 * This reads the pod settings from seededPodConfigJson.
 *
 * Handles the 3 steps of the registration process:
 *  1. Generating a new WebID.
 *  2. Registering a WebID with the IDP.
 *  3. Creating a new pod for the WebID.
 *
 * The base URL will be used as oidcIssuer value.
 */
export class SeededPodInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly webIdSuffix: string;
  private readonly identifierGenerator: IdentifierGenerator;
  private readonly accountStore: AccountStore;
  private readonly podManager: PodManager;
  private readonly configStorage: KeyValueStorage<string, unknown>;

  public constructor(args: SeederPodInitializerArgs) {
    super();
    this.webIdSuffix = args.webIdSuffix;
    this.baseUrl = args.baseUrl;
    this.identifierGenerator = args.identifierGenerator;
    this.configStorage = args.configStorage;
    this.accountStore = args.accountStore;
    this.podManager = args.podManager;
  }

  public async handle(): Promise<void> {
    let count = 0;
    for await (const [ , value ] of this.configStorage.entries()) {
      const config = value as NodeJS.Dict<string>;
      this.logger.info(`Initializing pod ${config.podName}`);

      const podBaseUrl: ResourceIdentifier = this.identifierGenerator.generate(config.podName!);

      // Create the webId
      config.webId = joinUrl(podBaseUrl.path, this.webIdSuffix);

      // Register the account
      const settings: AccountSettings = {
        useIdp: true,
        podBaseUrl: podBaseUrl.path,
      };
      await this.accountStore.create(config.email!, config.webId, config.password!, settings);

      // Create the pod
      const podSettings: PodSettings = {
        email: config.email!,
        webId: config.webId!,
        template: config.template,
        podBaseUrl: podBaseUrl.path,
        // Set the OIDC issuer to our server when registering with the IDP
        oidcIssuer: this.baseUrl,
      };

      try {
        await this.podManager.createPod(podBaseUrl, podSettings, false);
      } catch (error: unknown) {
        await this.accountStore.deleteAccount(config.email!);
        throw error;
      }

      // Verify the account
      // This prevents there being a small timeframe where the account can be used before the pod creation is finished.
      // That timeframe could potentially be used by malicious users.
      await this.accountStore.verify(config.email!);
      this.logger.info(`Initialized seeded pod and account for "${config.podName}".`);
      count += 1;
    }
    this.logger.info(`Initialized ${count} seeded pods.`);
  }
}
