import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import type { Json } from '../../util/Json';
import { readJsonStream } from '../../util/StreamUtil';
import type { InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';
import type { JsonInteractionHandler, JsonInteractionHandlerInput } from './JsonInteractionHandler';

/**
 * An {@link InteractionHandler} that sits in-between
 * an {@link InteractionHandler} and a {@link JsonInteractionHandler}.
 * It converts the input data stream into a JSON object to be used by the stored handler.
 *
 * Since the JSON body is only made during the `handle` call, it can not be used during the `canHandle`,
 * so the `canHandle` call of the stored handler is not called,
 * meaning this class accepts all input that can be converted to JSON.
 */
export class JsonConversionHandler extends InteractionHandler {
  private readonly source: JsonInteractionHandler;
  private readonly converter: RepresentationConverter;

  public constructor(source: JsonInteractionHandler, converter: RepresentationConverter) {
    super();
    this.source = source;
    this.converter = converter;
  }

  public async canHandle({ operation }: InteractionHandlerInput): Promise<void> {
    if (!operation.body.isEmpty) {
      await this.converter.canHandle({
        identifier: operation.target,
        preferences: { type: { [APPLICATION_JSON]: 1 }},
        representation: operation.body,
      });
    }
  }

  public async handle({ operation, oidcInteraction, accountId }: InteractionHandlerInput): Promise<Representation> {
    let json: Json = {};
    let jsonMetadata = operation.body.metadata;

    // Convert to JSON and read out if there is a body
    if (!operation.body.isEmpty) {
      const converted = await this.converter.handle({
        identifier: operation.target,
        preferences: { type: { [APPLICATION_JSON]: 1 }},
        representation: operation.body,
      });
      json = await readJsonStream(converted.data);
      jsonMetadata = converted.metadata;
    }

    // Input for the handler
    const input: JsonInteractionHandlerInput = {
      method: operation.method,
      target: operation.target,
      metadata: jsonMetadata,
      json,
      oidcInteraction,
      accountId,
    };

    const result = await this.source.handleSafe(input);

    // Convert the response JSON back to a Representation
    const responseMetadata = result.metadata ?? new RepresentationMetadata(operation.target);
    return new BasicRepresentation(JSON.stringify(result.json), responseMetadata, APPLICATION_JSON);
  }
}
