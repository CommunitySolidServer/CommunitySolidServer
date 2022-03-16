import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import type { JsonRepresentation } from './InteractionUtil';
import type { JsonInteractionHandlerInput } from './JsonInteractionHandler';
import { JsonInteractionHandler } from './JsonInteractionHandler';
import type { JsonView } from './JsonView';

/**
 * Utility class for the common case of a {@link JsonInteractionHandler}
 * describing the expected input on a GET request which is needed to do a POST request.
 *
 * Returns the result of a {@link JsonView} on GET requests.
 * POST requests are sent to the {@link JsonInteractionHandler}.
 * Other methods will be rejected.
 */
export class ViewInteractionHandler extends JsonInteractionHandler {
  private readonly source: JsonInteractionHandler & JsonView;

  public constructor(source: JsonInteractionHandler & JsonView) {
    super();
    this.source = source;
  }

  public async canHandle(input: JsonInteractionHandlerInput): Promise<void> {
    const { method } = input;
    if (method !== 'GET' && method !== 'POST') {
      throw new MethodNotAllowedHttpError([ method ], 'Only GET/POST requests are supported.');
    }

    if (method === 'POST') {
      await this.source.canHandle(input);
    }
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    if (input.method === 'GET') {
      return this.source.getView(input);
    }
    return this.source.handle(input);
  }
}
