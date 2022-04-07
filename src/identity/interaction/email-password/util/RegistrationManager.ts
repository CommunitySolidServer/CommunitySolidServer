import assert from 'assert';
import type { ResourceIdentifier } from '../../../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { IdentifierGenerator } from '../../../../pods/generate/IdentifierGenerator';
import type { PodManager } from '../../../../pods/PodManager';
import type { PodSettings } from '../../../../pods/settings/PodSettings';
import { hasScheme } from '../../../../util/HeaderUtil';
import { joinUrl } from '../../../../util/PathUtil';
import type { OwnershipValidator } from '../../../ownership/OwnershipValidator';
import { assertPassword } from '../EmailPasswordUtil';
import type { AccountSettings, AccountStore } from '../storage/AccountStore';

export interface RegistrationManagerArgs {
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
 * The parameters expected for registration.
 */
export interface RegistrationParams {
  email: string;
  webId?: string;
  password: string;
  podName?: string;
  template?: string;
  createWebId: boolean;
  register: boolean;
  createPod: boolean;
  rootPod: boolean;
}

/**
 * The result of a registration action.
 */
export interface RegistrationResponse {
  email: string;
  webId?: string;
  oidcIssuer?: string;
  podBaseUrl?: string;
  createWebId: boolean;
  register: boolean;
  createPod: boolean;
}

const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/u;

/**
 * Supports IDP registration and pod creation based on input parameters.
 *
 * The above behaviour is combined in the two class functions.
 * `validateInput` will make sure all incoming data is correct and makes sense.
 * `register` will call all the correct handlers based on the requirements of the validated parameters.
 */
export class RegistrationManager {
  protected readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly webIdSuffix: string;
  private readonly identifierGenerator: IdentifierGenerator;
  private readonly ownershipValidator: OwnershipValidator;
  private readonly accountStore: AccountStore;
  private readonly podManager: PodManager;

  public constructor(args: RegistrationManagerArgs) {
    this.baseUrl = args.baseUrl;
    this.webIdSuffix = args.webIdSuffix;
    this.identifierGenerator = args.identifierGenerator;
    this.ownershipValidator = args.ownershipValidator;
    this.accountStore = args.accountStore;
    this.podManager = args.podManager;
  }

  /**
   * Trims the input if it is a string, returns `undefined` otherwise.
   */
  private trimString(input: unknown): string | undefined {
    if (typeof input === 'string') {
      return input.trim();
    }
  }

  /**
   * Makes sure the input conforms to the following requirements when relevant:
   *  * At least one option needs to be chosen.
   *  * In case a new WebID needs to be created, the other 2 steps will be set to true.
   *  * Valid email/WebID/password/podName when required.
   *  * Only create a root pod when allowed.
   *
   * @param input - Input parameters for the registration procedure.
   * @param allowRoot - If creating a pod in the root container should be allowed.
   *
   * @returns A cleaned up version of the input parameters.
   * Only (trimmed) parameters that are relevant to the registration procedure will be retained.
   */
  public validateInput(input: NodeJS.Dict<unknown>, allowRoot = false): RegistrationParams {
    const {
      email, password, confirmPassword, webId, podName, register, createPod, createWebId, template, rootPod,
    } = input;

    // Parse email
    const trimmedEmail = this.trimString(email);
    assert(trimmedEmail && emailRegex.test(trimmedEmail), 'Please enter a valid e-mail address.');

    assertPassword(password, confirmPassword);

    const validated: RegistrationParams = {
      email: trimmedEmail,
      password,
      register: Boolean(register) || Boolean(createWebId),
      createPod: Boolean(createPod) || Boolean(createWebId),
      createWebId: Boolean(createWebId),
      rootPod: Boolean(rootPod),
    };
    assert(validated.register || validated.createPod, 'Please register for a WebID or create a Pod.');
    assert(allowRoot || !validated.rootPod, 'Creating a root pod is not supported.');

    // Parse WebID
    if (!validated.createWebId) {
      const trimmedWebId = this.trimString(webId);
      assert(trimmedWebId && hasScheme(trimmedWebId, 'http', 'https'), 'Please enter a valid WebID.');
      validated.webId = trimmedWebId;
    }

    // Parse Pod name
    if (validated.createPod && !validated.rootPod) {
      const trimmedPodName = this.trimString(podName);
      assert(trimmedPodName && trimmedPodName.length > 0, 'Please specify a Pod name.');
      validated.podName = trimmedPodName;
    }

    // Parse template if there is one
    if (template) {
      validated.template = this.trimString(template);
    }

    return validated;
  }

  /**
   * Handles the 3 potential steps of the registration process:
   *  1. Generating a new WebID.
   *  2. Registering a WebID with the IDP.
   *  3. Creating a new pod for a given WebID.
   *
   * All of these steps are optional and will be determined based on the input parameters.
   *
   * This includes the following steps:
   *  * Ownership will be verified when the WebID is provided.
   *  * When registering and creating a pod, the base URL will be used as oidcIssuer value.
   */
  public async register(input: RegistrationParams, allowRoot = false): Promise<RegistrationResponse> {
    // This is only used when createWebId and/or createPod are true
    let podBaseUrl: ResourceIdentifier | undefined;
    if (input.createPod) {
      if (input.rootPod) {
        podBaseUrl = { path: this.baseUrl };
      } else {
        podBaseUrl = this.identifierGenerator.generate(input.podName!);
      }
    }

    // Create or verify the WebID
    if (input.createWebId) {
      input.webId = joinUrl(podBaseUrl!.path, this.webIdSuffix);
    } else {
      await this.ownershipValidator.handleSafe({ webId: input.webId! });
    }

    // Register the account
    const settings: AccountSettings = {
      useIdp: input.register,
      podBaseUrl: podBaseUrl?.path,
      clientCredentials: [],
    };
    await this.accountStore.create(input.email, input.webId!, input.password, settings);

    // Create the pod
    if (input.createPod) {
      const podSettings: PodSettings = {
        email: input.email,
        webId: input.webId!,
        template: input.template,
        podBaseUrl: podBaseUrl!.path,
      };

      // Set the OIDC issuer to our server when registering with the IDP
      if (input.register) {
        podSettings.oidcIssuer = this.baseUrl;
      }

      try {
        // Only allow overwrite for root pods
        await this.podManager.createPod(podBaseUrl!, podSettings, allowRoot);
      } catch (error: unknown) {
        await this.accountStore.deleteAccount(input.email);
        throw error;
      }
    }

    // Verify the account
    // This prevents there being a small timeframe where the account can be used before the pod creation is finished.
    // That timeframe could potentially be used by malicious users.
    await this.accountStore.verify(input.email);

    return {
      webId: input.webId,
      email: input.email,
      oidcIssuer: this.baseUrl,
      podBaseUrl: podBaseUrl?.path,
      createWebId: input.createWebId,
      register: input.register,
      createPod: input.createPod,
    };
  }
}

