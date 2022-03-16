import { readJson } from 'fs-extra';
import { array, object, string } from 'yup';
import { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
import type { JsonInteractionHandler } from '../identity/interaction/JsonInteractionHandler';
import type { ResolveLoginHandler } from '../identity/interaction/login/ResolveLoginHandler';
import { URL_SCHEMA } from '../identity/interaction/YupUtil';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { Initializer } from './Initializer';

const inSchema = array().of(object({
  email: string().trim().email().lowercase()
    .required(),
  password: string().trim().min(1).required(),
  pods: array().of(object({
    name: string().trim().min(1).required(),
    settings: object({
      webId: URL_SCHEMA,
    }).optional(),
  })).optional(),
})).required();

export interface SeededAccountInitializerArgs {
  /**
   * Creates the accounts.
   */
  accountHandler: ResolveLoginHandler;
  /**
   * Adds the login methods.
   */
  passwordHandler: JsonInteractionHandler;
  /**
   * Creates the pods.
   */
  podHandler: JsonInteractionHandler;
  /**
   * File path of the JSON describing the accounts to seed.
   */
  configFilePath?: string;
}

/**
 * Initializes a set of accounts based on the input data.
 * These accounts have exactly 1 email/password login method, and 0 or more pods.
 * The pod settings that can be defined are identical to those of the {@link CreatePodHandler}.
 */
export class SeededAccountInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);

  private readonly accountHandler: ResolveLoginHandler;
  private readonly passwordHandler: JsonInteractionHandler;
  private readonly podHandler: JsonInteractionHandler;
  private readonly configFilePath?: string;

  public constructor(args: SeededAccountInitializerArgs) {
    super();
    this.accountHandler = args.accountHandler;
    this.passwordHandler = args.passwordHandler;
    this.podHandler = args.podHandler;
    this.configFilePath = args.configFilePath;
  }

  public async handle(): Promise<void> {
    // This value being undefined means that the variable linking to the seed config is not defined
    // and this class should just do nothing.
    if (!this.configFilePath) {
      return;
    }

    let configuration: typeof inSchema.__outputType;
    try {
      configuration = await inSchema.validate(await readJson(this.configFilePath, 'utf8'));
    } catch (error: unknown) {
      const msg = `Invalid account seed file: ${createErrorMessage(error)}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    // Dummy data for requests to all the handlers
    const method = 'POST';
    const target = { path: '' };
    const metadata = new RepresentationMetadata();

    let accounts = 0;
    let pods = 0;
    for await (const input of configuration) {
      try {
        this.logger.info(`Creating account for ${input.email}`);
        const accountResult = await this.accountHandler.login({ method, target, metadata, json: {}});
        const { accountId } = accountResult.json;
        await this.passwordHandler.handleSafe({ method, target, metadata, accountId, json: input });
        accounts += 1;

        for (const pod of input.pods ?? []) {
          this.logger.info(`Creating pod with name ${pod.name}`);
          await this.podHandler.handleSafe({ method, target, metadata, accountId, json: pod });
          pods += 1;
        }
      } catch (error: unknown) {
        this.logger.warn(`Error while initializing seeded account: ${createErrorMessage(error)}`);
      }
    }
    this.logger.info(`Initialized ${accounts} accounts and ${pods} pods.`);
  }
}
