import type { ErrorHandler } from '../ldp/http/ErrorHandler';
import type { ResponseWriter } from '../ldp/http/ResponseWriter';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import { assertError } from '../util/errors/ErrorUtil';
import type { ProviderFactory } from './configuration/ProviderFactory';
import type { InteractionHttpHandler } from './interaction/InteractionHttpHandler';

/**
 * Handles all requests relevant for the entire IDP interaction,
 * by sending them to either the stored {@link InteractionHttpHandler},
 * or the generated Provider from the {@link ProviderFactory} if the first does not support the request.
 *
 * The InteractionHttpHandler would handle all requests where we need custom behaviour,
 * such as everything related to generating and validating an account.
 * The Provider handles all the default request such as the initial handshake.
 *
 * This handler handles all requests since it assumes all those requests are relevant for the IDP interaction.
 * A {@link RouterHandler} should be used to filter out other requests.
 */
export class IdentityProviderHttpHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly providerFactory: ProviderFactory;
  private readonly interactionHttpHandler: InteractionHttpHandler;
  private readonly errorHandler: ErrorHandler;
  private readonly responseWriter: ResponseWriter;

  public constructor(
    providerFactory: ProviderFactory,
    interactionHttpHandler: InteractionHttpHandler,
    errorHandler: ErrorHandler,
    responseWriter: ResponseWriter,
  ) {
    super();
    this.providerFactory = providerFactory;
    this.interactionHttpHandler = interactionHttpHandler;
    this.errorHandler = errorHandler;
    this.responseWriter = responseWriter;
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    const provider = await this.providerFactory.getProvider();

    // If our own interaction handler does not support the input, it must be a request for the OIDC library
    try {
      await this.interactionHttpHandler.canHandle({ ...input, provider });
    } catch {
      this.logger.debug(`Sending request to oidc-provider: ${input.request.url}`);
      return provider.callback(input.request, input.response);
    }

    try {
      await this.interactionHttpHandler.handle({ ...input, provider });
    } catch (error: unknown) {
      assertError(error);
      // Setting preferences to text/plain since we didn't parse accept headers, see #764
      const result = await this.errorHandler.handleSafe({ error, preferences: { type: { 'text/plain': 1 }}});
      await this.responseWriter.handleSafe({ response: input.response, result });
    }
  }
}
