import * as path from 'path';
import { createReadStream, readJson } from 'fs-extra';
import { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
import type { RegistrationManager } from '../identity/interaction/email-password/util/RegistrationManager';
import { getLoggerFor } from '../logging/LogUtil';
import type { BaseResourceStore } from '../storage/BaseResourceStore';
import { guardStream } from '../util/GuardedStream';
import { joinUrl } from '../util/PathUtil';
import { AclHelper } from './AclHelper';
import { Initializer } from './Initializer';

/**
 * Uses a {@link RegistrationManager} to initialize accounts and pods
 * for all seeded pods. Reads the pod settings from seededPodConfigJson.
 */
export class SeededPodInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);

  private readonly registrationManager: RegistrationManager;
  private readonly store: BaseResourceStore;
  private readonly configFilePath: string | null;
  private readonly aclHelper: AclHelper;

  public constructor(
    registrationManager: RegistrationManager,
    store: BaseResourceStore,
    configFilePath: string | null,
  ) {
    super();
    this.registrationManager = registrationManager;
    this.store = store;
    this.aclHelper = new AclHelper(store);
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
      const { podBaseUrl } = await this.registrationManager.register(validated, true);
      this.logger.info(`Initialized seeded pod and account for "${input.podName}".`);
      count += 1;

      if (input.data) {
        for (const { path: filePath, resource, contentType } of input.data) {
          const url = joinUrl(podBaseUrl!, resource);

          await this.store.setRepresentation(
            {
              path: url,
            },
            {
              binary: true,
              isEmpty: false,
              data: guardStream(createReadStream(path.join(path.dirname(this.configFilePath), filePath))),
              metadata: new RepresentationMetadata({ path: url }, contentType),
            },
          );

          await this.aclHelper.setSimpleAcl(url, {
            permissions: input.permissions ?? {
              read: true,
            },
            agentClass: 'agent',
            accessTo: true,
            default: true,
          });
        }
        this.logger.info(`Loaded ${input.data.length} data files for ${input.podName}`);
      }
    }
    this.logger.info(`Initialized ${count} seeded pods.`);
  }
}
