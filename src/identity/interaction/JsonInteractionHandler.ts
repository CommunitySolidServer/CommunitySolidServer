import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { Json } from '../../util/Json';
import type { Interaction } from './InteractionHandler';
import type { JsonRepresentation } from './InteractionUtil';
import Dict = NodeJS.Dict;

export interface JsonInteractionHandlerInput {
  /**
   * The operation to execute.
   */
  method: string;
  /**
   * The resource that is being targeted.
   */
  target: ResourceIdentifier;
  /**
   * The JSON body of the request.
   */
  json: unknown;
  /**
   * The metadata of the request.
   */
  metadata: RepresentationMetadata;
  /**
   * Will be defined if the OIDC library expects us to resolve an interaction it can't handle itself,
   * such as logging a user in.
   */
  oidcInteraction?: Interaction;
  /**
   * The account id of the agent doing the request if one could be found.
   */
  accountId?: string;
}

/**
 * A handler that consumes and returns a JSON object,
 * designed to be used for IDP/OIDC interactions.
 */
export abstract class JsonInteractionHandler<TOut extends Dict<Json> = Dict<Json>>
  extends AsyncHandler<JsonInteractionHandlerInput, JsonRepresentation<TOut>> {}
