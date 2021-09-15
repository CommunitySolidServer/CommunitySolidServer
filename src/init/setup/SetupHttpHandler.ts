import type { RegistrationParams,
  RegistrationManager } from '../../identity/interaction/email-password/util/RegistrationManager';
import type { ErrorHandler } from '../../ldp/http/ErrorHandler';
import type { RequestParser } from '../../ldp/http/RequestParser';
import { ResponseDescription } from '../../ldp/http/response/ResponseDescription';
import type { ResponseWriter } from '../../ldp/http/ResponseWriter';
import type { Operation } from '../../ldp/operations/Operation';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import { getLoggerFor } from '../../logging/LogUtil';
import type { BaseHttpHandlerArgs } from '../../server/BaseHttpHandler';
import { BaseHttpHandler } from '../../server/BaseHttpHandler';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { APPLICATION_JSON, TEXT_HTML } from '../../util/ContentTypes';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import { HttpError } from '../../util/errors/HttpError';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { addTemplateMetadata } from '../../util/ResourceUtil';
import { readJsonStream } from '../../util/StreamUtil';
import type { Initializer } from '../Initializer';

/**
 * Input parameters expected in calls to the handler.
 * Will be sent to the RegistrationManager for validation and registration.
 * The reason this is a flat object and does not have a specific field for all the registration parameters
 * is so we can also support form data.
 */
export interface SetupInput extends Record<string, any>{
  /**
   * Indicates if the initializer should be executed. Ignored if `registration` is true.
   */
  initialize?: boolean;
  /**
   * Indicates if the registration procedure should be done for IDP registration and/or pod provisioning.
   */
  registration?: boolean;
}

export interface SetupHttpHandlerArgs extends BaseHttpHandlerArgs {
  // BaseHttpHandler args
  requestParser: RequestParser;
  errorHandler: ErrorHandler;
  responseWriter: ResponseWriter;

  /**
   * Used for registering a pod during setup.
   */
  registrationManager?: RegistrationManager;
  /**
   * Initializer to call in case no registration procedure needs to happen.
   * This Initializer should make sure the necessary resources are there so the server can work correctly.
   */
  initializer?: Initializer;
  /**
   * Used for content negotiation.
   */
  converter: RepresentationConverter;
  /**
   * Key that is used to store the boolean in the storage indicating setup is finished.
   */
  storageKey: string;
  /**
   * Used to store setup status.
   */
  storage: KeyValueStorage<string, boolean>;
  /**
   * Template to use for GET requests.
   */
  viewTemplate: string;
  /**
   * Template to show when setup was completed successfully.
   */
  responseTemplate: string;
}

/**
 * Handles the initial setup of a server.
 * Will capture all requests until setup is finished,
 * this to prevent accidentally running unsafe servers.
 *
 * GET requests will return the view template which should contain the setup information for the user.
 * POST requests will run an initializer and/or perform a registration step, both optional.
 * After successfully completing a POST request this handler will disable itself and become unreachable.
 * All other methods will be rejected.
 */
export class SetupHttpHandler extends BaseHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly registrationManager?: RegistrationManager;
  private readonly initializer?: Initializer;
  private readonly converter: RepresentationConverter;
  private readonly storageKey: string;
  private readonly storage: KeyValueStorage<string, boolean>;
  private readonly viewTemplate: string;
  private readonly responseTemplate: string;

  private finished: boolean;

  public constructor(args: SetupHttpHandlerArgs) {
    super(args);
    this.finished = false;

    this.registrationManager = args.registrationManager;
    this.initializer = args.initializer;
    this.converter = args.converter;
    this.storageKey = args.storageKey;
    this.storage = args.storage;
    this.viewTemplate = args.viewTemplate;
    this.responseTemplate = args.responseTemplate;
  }

  public async handleOperation(operation: Operation): Promise<ResponseDescription> {
    let json: Record<string, any>;
    let template: string;
    let success = false;
    let statusCode = 200;
    try {
      ({ json, template } = await this.getJsonResult(operation));
      success = true;
    } catch (err: unknown) {
      // We want to show the errors on the original page in case of HTML interactions, so we can't just throw them here
      const error = HttpError.isInstance(err) ? err : new InternalServerError(createErrorMessage(err));
      ({ statusCode } = error);
      this.logger.warn(error.message);
      const response = await this.errorHandler.handleSafe({ error, preferences: { type: { [APPLICATION_JSON]: 1 }}});
      json = await readJsonStream(response.data!);
      template = this.viewTemplate;
    }

    // Convert the response JSON to the required format
    const representation = new BasicRepresentation(JSON.stringify(json), operation.target, APPLICATION_JSON);
    addTemplateMetadata(representation.metadata, template, TEXT_HTML);
    const result = await this.converter.handleSafe(
      { representation, identifier: operation.target, preferences: operation.preferences },
    );

    // Make sure this setup handler is never used again after a successful POST request
    if (success && operation.method === 'POST') {
      this.finished = true;
      await this.storage.set(this.storageKey, true);
    }

    return new ResponseDescription(statusCode, result.metadata, result.data);
  }

  /**
   * Creates a JSON object representing the result of executing the given operation,
   * together with the template it should be applied to.
   */
  private async getJsonResult(operation: Operation): Promise<{ json: Record<string, any>; template: string }> {
    if (operation.method === 'GET') {
      // Return the initial setup page
      return { json: {}, template: this.viewTemplate };
    }
    if (operation.method !== 'POST') {
      throw new MethodNotAllowedHttpError();
    }

    // Registration manager expects JSON data
    let json: SetupInput = {};
    if (operation.body) {
      const args = {
        representation: operation.body,
        preferences: { type: { [APPLICATION_JSON]: 1 }},
        identifier: operation.target,
      };
      const converted = await this.converter.handleSafe(args);
      json = await readJsonStream(converted.data);
      this.logger.debug(`Input JSON: ${JSON.stringify(json)}`);
    }

    // We want to initialize after the input has been validated, but before (potentially) writing a pod
    // since that might overwrite the initializer result
    if (json.initialize && !json.registration) {
      if (!this.initializer) {
        throw new NotImplementedHttpError('This server is not configured with a setup initializer.');
      }
      await this.initializer.handleSafe();
    }

    let output: Record<string, any> = {};
    // We only call the RegistrationManager when getting registration input.
    // This way it is also possible to set up a server without requiring registration parameters.
    let validated: RegistrationParams | undefined;
    if (json.registration) {
      if (!this.registrationManager) {
        throw new NotImplementedHttpError('This server is not configured to support registration during setup.');
      }
      // Validate the input JSON
      validated = this.registrationManager.validateInput(json, true);
      this.logger.debug(`Validated input: ${JSON.stringify(validated)}`);

      // Register and/or create a pod as requested. Potentially does nothing if all booleans are false.
      output = await this.registrationManager.register(validated, true);
    }

    // Add extra setup metadata
    output.initialize = Boolean(json.initialize);
    output.registration = Boolean(json.registration);
    this.logger.debug(`Output: ${JSON.stringify(output)}`);

    return { json: output, template: this.responseTemplate };
  }
}
