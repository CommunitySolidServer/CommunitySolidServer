import assert from 'assert';
import type { Operation } from '../../../../ldp/operations/Operation';
import type { ResourceIdentifier } from '../../../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { IdentifierGenerator } from '../../../../pods/generate/IdentifierGenerator';
import type { PodManager } from '../../../../pods/PodManager';
import type { PodSettings } from '../../../../pods/settings/PodSettings';
import { joinUrl } from '../../../../util/PathUtil';
import type { OwnershipValidator } from '../../../ownership/OwnershipValidator';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import { assertPassword, throwIdpInteractionError } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';
import type { InteractionResponseResult, InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';

const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/u;

export interface RegistrationHandlerArgs {
  /**
   * Used to set the `oidcIssuer` value of newly registered pods.
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
   * Verifies the user is the owner of the WebID they provide.
   */
  ownershipValidator: OwnershipValidator;
  /**
   * Stores all the registered account information.
   */
  accountStore: AccountStore;
  /**
   * Creates the new pods.
   */
  podManager: PodManager;
}

/**
 * All the parameters that will be parsed from a request.
 */
interface ParsedInput {
  email: string;
  webId?: string;
  password?: string;
  podName?: string;
  template?: string;
  createWebId: boolean;
  register: boolean;
  createPod: boolean;
}

/**
 * The results that will be applied to the response template.
 */
interface RegistrationResponse {
  email: string;
  webId?: string;
  oidcIssuer?: string;
  podBaseUrl?: string;
  createWebId: boolean;
  register: boolean;
  createPod: boolean;
}

/**
 * This class handles the 3 potential steps of the registration process:
 *  1. Generating a new WebID.
 *  2. Registering a WebID with the IDP.
 *  3. Creating a new pod for a given WebID.
 *
 * All of these steps are optional and will be determined based on the input parameters of a request,
 * with the following considerations:
 *  * At least one option needs to be chosen.
 *  * In case a new WebID needs to be created, the other 2 steps are obligatory.
 *  * Ownership will be verified when the WebID is provided.
 *  * When registering and creating a pod, the base URL will be used as oidcIssuer value.
 */
export class RegistrationHandler extends InteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly webIdSuffix: string;
  private readonly identifierGenerator: IdentifierGenerator;
  private readonly ownershipValidator: OwnershipValidator;
  private readonly accountStore: AccountStore;
  private readonly podManager: PodManager;

  public constructor(args: RegistrationHandlerArgs) {
    super();
    this.baseUrl = args.baseUrl;
    this.webIdSuffix = args.webIdSuffix;
    this.identifierGenerator = args.identifierGenerator;
    this.ownershipValidator = args.ownershipValidator;
    this.accountStore = args.accountStore;
    this.podManager = args.podManager;
  }

  public async handle({ operation }: InteractionHandlerInput):
  Promise<InteractionResponseResult<RegistrationResponse>> {
    const result = await this.parseInput(operation);

    try {
      const details = await this.register(result);
      return { type: 'response', details };
    } catch (error: unknown) {
      // Don't expose the password field
      delete result.password;
      throwIdpInteractionError(error, result as Record<string, any>);
    }
  }

  /**
   * Does the full registration and pod creation process,
   * with the steps chosen by the values in the `ParseResult`.
   */
  private async register(result: ParsedInput): Promise<RegistrationResponse> {
    // This is only used when createWebId and/or createPod are true
    let podBaseUrl: ResourceIdentifier | undefined;
    if (result.createWebId || result.createPod) {
      podBaseUrl = this.identifierGenerator.generate(result.podName!);
    }

    // Create or verify the WebID
    if (result.createWebId) {
      result.webId = joinUrl(podBaseUrl!.path, this.webIdSuffix);
    } else {
      await this.ownershipValidator.handleSafe({ webId: result.webId! });
    }

    // Register the account
    if (result.register) {
      await this.accountStore.create(result.email, result.webId!, result.password!);
    }

    // Create the pod
    if (result.createPod) {
      const podSettings: PodSettings = {
        email: result.email,
        webId: result.webId!,
        template: result.template,
        podBaseUrl: podBaseUrl!.path,
      };

      // Set the OIDC issuer to our server when registering with the IDP
      if (result.register) {
        podSettings.oidcIssuer = this.baseUrl;
      }

      try {
        await this.podManager.createPod(podBaseUrl!, podSettings);
      } catch (error: unknown) {
        // In case pod creation errors we don't want to keep the account
        if (result.register) {
          await this.accountStore.deleteAccount(result.email);
        }
        throw error;
      }
    }

    // Verify the account
    if (result.register) {
      // This prevents there being a small timeframe where the account can be used before the pod creation is finished.
      // That timeframe could potentially be used by malicious users.
      await this.accountStore.verify(result.email);
    }

    return {
      webId: result.webId,
      email: result.email,
      oidcIssuer: this.baseUrl,
      podBaseUrl: podBaseUrl?.path,
      createWebId: result.createWebId,
      register: result.register,
      createPod: result.createPod,
    };
  }

  /**
   * Parses the input request into a `ParseResult`.
   */
  private async parseInput(operation: Operation): Promise<ParsedInput> {
    const parsed = await getFormDataRequestBody(operation);
    const prefilled: Record<string, string> = {};
    try {
      for (const [ key, value ] of Object.entries(parsed)) {
        assert(!Array.isArray(value), `Unexpected multiple values for ${key}.`);
        prefilled[key] = value ? value.trim() : '';
      }
      return this.validateInput(prefilled);
    } catch (err: unknown) {
      throwIdpInteractionError(err, prefilled);
    }
  }

  /**
   * Converts the raw input date into a `ParseResult`.
   * Verifies that all the data combinations make sense.
   */
  private validateInput(parsed: NodeJS.Dict<string>): ParsedInput {
    const { email, password, confirmPassword, webId, podName, register, createPod, createWebId, template } = parsed;

    // Parse email
    assert(typeof email === 'string' && emailRegex.test(email), 'Please enter a valid e-mail address.');

    const validated: ParsedInput = {
      email,
      template,
      register: Boolean(register) || Boolean(createWebId),
      createPod: Boolean(createPod) || Boolean(createWebId),
      createWebId: Boolean(createWebId),
    };
    assert(validated.register || validated.createPod, 'Please register for a WebID or create a Pod.');

    // Parse WebID
    if (!validated.createWebId) {
      assert(typeof webId === 'string' && /^https?:\/\/[^/]+/u.test(webId), 'Please enter a valid WebID.');
      validated.webId = webId;
    }

    // Parse Pod name
    if (validated.createWebId || validated.createPod) {
      assert(typeof podName === 'string' && podName.length > 0, 'Please specify a Pod name.');
      validated.podName = podName;
    }

    // Parse account
    if (validated.register) {
      assertPassword(password, confirmPassword);
      validated.password = password;
    }

    return validated;
  }
}
