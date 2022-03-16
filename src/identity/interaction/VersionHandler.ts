import type { JsonRepresentation } from './InteractionUtil';
import type { JsonInteractionHandlerInput } from './JsonInteractionHandler';
import { JsonInteractionHandler } from './JsonInteractionHandler';

const INTERNAL_API_VERSION = '0.5';

/**
 * Adds the current version of the API to the JSON output.
 * This version number should be updated every time the API changes.
 */
export class VersionHandler extends JsonInteractionHandler {
  private readonly source: JsonInteractionHandler;

  public constructor(source: JsonInteractionHandler) {
    super();
    this.source = source;
  }

  public async canHandle(input: JsonInteractionHandlerInput): Promise<void> {
    await this.source.canHandle(input);
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    const result = await this.source.handle(input);
    result.json.version = INTERNAL_API_VERSION;
    return result;
  }
}
