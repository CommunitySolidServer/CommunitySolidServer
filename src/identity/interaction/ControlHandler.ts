import type { Json } from '../../util/Json';
import { ACCOUNT_ID_KEY } from './account/AccountIdRoute';
import type { JsonRepresentation } from './InteractionUtil';
import type { JsonInteractionHandlerInput } from './JsonInteractionHandler';
import { JsonInteractionHandler } from './JsonInteractionHandler';
import type { InteractionRoute } from './routing/InteractionRoute';
import Dict = NodeJS.Dict;

/**
 * Creates an object with the keys matching those of the input `controls`,
 * and the values being the results received by the matching values in the same input.
 *
 * If `source` is defined, the controls will be added to the output of that handler after passing the input.
 * In case the control keys conflict with a key already present in the resulting object,
 * the results will be merged.
 */
export class ControlHandler extends JsonInteractionHandler {
  private readonly controls: Record<string, InteractionRoute | JsonInteractionHandler>;
  private readonly source?: JsonInteractionHandler;

  public constructor(
    controls: Record<string, InteractionRoute | JsonInteractionHandler>,
    source?: JsonInteractionHandler,
  ) {
    super();
    this.controls = controls;
    this.source = source;
  }

  public async canHandle(input: JsonInteractionHandlerInput): Promise<void> {
    await this.source?.canHandle(input);
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    const result = await this.source?.handle(input);
    const controls = await this.generateControls(input);

    const json = this.mergeControls(result?.json, controls) as Dict<Json>;

    return {
      json,
      metadata: result?.metadata,
    };
  }

  protected isRoute(value: InteractionRoute | JsonInteractionHandler): value is InteractionRoute {
    return Boolean((value as InteractionRoute).getPath);
  }

  /**
   * Generate the controls for all the stored keys.
   */
  protected async generateControls(input: JsonInteractionHandlerInput): Promise<Dict<Json>> {
    let controls: Record<string, Json> = {};

    for (const [ key, value ] of Object.entries(this.controls)) {
      const controlSet = await this.generateControlSet(input, value);
      if (controlSet) {
        controls = this.mergeControls(controls, { [key]: controlSet }) as Record<string, Json>;
      }
    }

    return controls;
  }

  protected async generateControlSet(
    input: JsonInteractionHandlerInput,
    value: InteractionRoute | JsonInteractionHandler,
  ): Promise<Json | undefined> {
    if (this.isRoute(value)) {
      try {
        return value.getPath({ [ACCOUNT_ID_KEY]: input.accountId });
      } catch {
        // Path required an account ID which is missing
        return;
      }
    }
    const { json } = await value.handleSafe(input);
    if (Array.isArray(json) && json.length === 0) {
      return;
    }
    if (typeof json === 'object' && Object.keys(json).length === 0) {
      return;
    }
    return json;
  }

  /**
   * Merge the two objects.
   * Generally this will probably not be necessary, or be very simple merges,
   * but this ensures that we handle all possibilities.
   */
  protected mergeControls(original?: Json, controls?: Json): Json {
    if (typeof original === 'undefined') {
      return controls!;
    }

    if (typeof controls === 'undefined') {
      return original;
    }

    if (typeof original !== 'object' || typeof controls !== 'object') {
      return original;
    }

    if (Array.isArray(original)) {
      if (Array.isArray(controls)) {
        return [ ...original, ...controls ];
      }
      return original;
    }

    if (Array.isArray(controls)) {
      return original;
    }

    const result: Record<string, Json> = {};
    for (const key of new Set([ ...Object.keys(original), ...Object.keys(controls) ])) {
      result[key] = this.mergeControls(original[key], controls[key]);
    }
    return result;
  }
}
