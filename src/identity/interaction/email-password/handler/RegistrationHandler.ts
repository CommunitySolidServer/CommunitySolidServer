import assert from 'assert';
import urljoin from 'url-join';
import type { ResourceIdentifier } from '../../../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { IdentifierGenerator } from '../../../../pods/generate/IdentifierGenerator';
import type { PodManager } from '../../../../pods/PodManager';
import type { PodSettings } from '../../../../pods/settings/PodSettings';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { HttpHandler } from '../../../../server/HttpHandler';
import type { HttpRequest } from '../../../../server/HttpRequest';
import type { TemplateHandler } from '../../../../server/util/TemplateHandler';
import type { OwnershipValidator } from '../../../ownership/OwnershipValidator';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import { assertPassword, throwIdpInteractionError } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';

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
  /**
   * Renders the response when registration is successful.
   */
  responseHandler: TemplateHandler;
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
export class RegistrationHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly webIdSuffix: string;
  private readonly identifierGenerator: IdentifierGenerator;
  private readonly ownershipValidator: OwnershipValidator;
  private readonly accountStore: AccountStore;
  private readonly podManager: PodManager;
  private readonly responseHandler: TemplateHandler;

  public constructor(args: RegistrationHandlerArgs) {
    super();
    this.baseUrl = args.baseUrl;
    this.webIdSuffix = args.webIdSuffix;
    this.identifierGenerator = args.identifierGenerator;
    this.ownershipValidator = args.ownershipValidator;
    this.accountStore = args.accountStore;
    this.podManager = args.podManager;
    this.responseHandler = args.responseHandler;
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    const result = await this.parseInput(request);

    try {
      const contents = await this.register(result);
      await this.responseHandler.handleSafe({ response, contents });
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
      result.webId = urljoin(podBaseUrl!.path, this.webIdSuffix);
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
  private async parseInput(request: HttpRequest): Promise<ParsedInput> {
    const parsed = await getFormDataRequestBody(request);
    let prefilled: Record<string, string> = {};
    try {
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) {
          throw new Error(`Multiple values found for key ${key}`);
        }
      }
      prefilled = parsed as Record<string, string>;
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
    const { email, password, confirmPassword, podName, webId, template, createWebId, register, createPod } = parsed;

    assert(typeof email === 'string' && email.length > 0 && emailRegex.test(email),
      'A valid e-mail address is required');

    const result: ParsedInput = {
      email,
      template,
      createWebId: Boolean(createWebId),
      register: Boolean(register),
      createPod: Boolean(createPod),
    };

    const validWebId = typeof webId === 'string' && webId.length > 0;
    if (result.createWebId) {
      if (validWebId) {
        throw new Error('A WebID should only be provided when no new one is being created');
      }
    } else {
      if (!validWebId) {
        throw new Error('A WebID is required if no new one is being created');
      }
      result.webId = webId;
    }

    if (result.register) {
      assertPassword(password, confirmPassword);
      result.password = password;
    } else if (typeof password === 'string' && password.length > 0) {
      throw new Error('A password should only be provided when registering');
    }

    if (result.createWebId || result.createPod) {
      assert(typeof podName === 'string' && podName.length > 0,
        'A pod name is required when creating a pod and/or WebID');
      result.podName = podName;
    } else if (typeof podName === 'string' && podName.length > 0) {
      throw new Error('A pod name should only be provided when creating a pod and/or WebID');
    }

    if (result.createWebId && !(result.register && result.createPod)) {
      throw new Error('Creating a WebID is only possible when also registering and creating a pod');
    }

    if (!result.createWebId && !result.register && !result.createPod) {
      throw new Error('At least one option needs to be chosen');
    }

    return result;
  }
}
