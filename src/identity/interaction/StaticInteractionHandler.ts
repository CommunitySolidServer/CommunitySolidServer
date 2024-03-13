import type { Json } from '../../util/Json';
import type { JsonRepresentation } from './InteractionUtil';
import { JsonInteractionHandler } from './JsonInteractionHandler';

/**
 * An {@link JsonInteractionHandler} that always returns the same JSON response on all requests.
 */
export class StaticInteractionHandler extends JsonInteractionHandler {
  private readonly response: Record<string, Json>;

  /**
   * @param response - @range {json}
   */
  public constructor(response: Record<string, Json>) {
    super();
    this.response = response;
  }

  public async handle(): Promise<JsonRepresentation> {
    return { json: this.response };
  }
}
