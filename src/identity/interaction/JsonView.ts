import type { JsonRepresentation } from './InteractionUtil';
import type { JsonInteractionHandlerInput } from './JsonInteractionHandler';

/**
 * An interface that can be used by classes that can provide a view besides doing an action.
 * Designed to be used by a {@link JsonInteractionHandler} that has a view explaining what JSON input it supports.
 */
export interface JsonView {
  getView: (input: JsonInteractionHandlerInput) => Promise<JsonRepresentation>;
}
