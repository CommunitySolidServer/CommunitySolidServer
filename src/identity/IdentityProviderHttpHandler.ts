import { OkResponseDescription } from '../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import { getLoggerFor } from '../logging/LogUtil';
import type { OperationHttpHandlerInput } from '../server/OperationHttpHandler';
import { OperationHttpHandler } from '../server/OperationHttpHandler';
import type { RepresentationConverter } from '../storage/conversion/RepresentationConverter';
import { APPLICATION_JSON } from '../util/ContentTypes';
import type { ProviderFactory } from './configuration/ProviderFactory';
import type {
  InteractionHandler,
  Interaction,
} from './interaction/InteractionHandler';

export interface IdentityProviderHttpHandlerArgs {
  /**
   * Used to generate the OIDC provider.
   */
  providerFactory: ProviderFactory;
  /**
   * Used for converting the input data.
   */
  converter: RepresentationConverter;
  /**
   * Handles the requests.
   */
  handler: InteractionHandler;
}

/**
 * Generates the active Interaction object if there is an ongoing OIDC interaction
 * and sends it to the {@link InteractionHandler}.
 *
 * Input data will first be converted to JSON.
 *
 * Only GET and POST methods are accepted.
 */
export class IdentityProviderHttpHandler extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly providerFactory: ProviderFactory;
  private readonly converter: RepresentationConverter;
  private readonly handler: InteractionHandler;

  public constructor(args: IdentityProviderHttpHandlerArgs) {
    super();
    this.providerFactory = args.providerFactory;
    this.converter = args.converter;
    this.handler = args.handler;
  }

  public async handle({ operation, request, response }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    // This being defined means we're in an OIDC session
    let oidcInteraction: Interaction | undefined;
    try {
      const provider = await this.providerFactory.getProvider();
      oidcInteraction = await provider.interactionDetails(request, response);
      this.logger.debug('Found an active OIDC interaction.');
    } catch {
      this.logger.debug('No active OIDC interaction found.');
    }

    // Convert input data to JSON
    // Allows us to still support form data
    const { contentType } = operation.body.metadata;
    if (contentType && contentType !== APPLICATION_JSON) {
      this.logger.debug(`Converting input ${contentType} to ${APPLICATION_JSON}`);
      const args = {
        representation: operation.body,
        preferences: { type: { [APPLICATION_JSON]: 1 }},
        identifier: operation.target,
      };
      operation = {
        ...operation,
        body: await this.converter.handleSafe(args),
      };
    }

    const representation = await this.handler.handleSafe({ operation, oidcInteraction });
    return new OkResponseDescription(representation.metadata, representation.data);
  }
}
