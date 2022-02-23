/* eslint-disable tsdoc/syntax */
// tsdoc/syntax cannot handle `@range`
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import type { InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';

/**
 * An {@link InteractionHandler} that always returns the same JSON response on all requests.
 */
export class FixedInteractionHandler extends InteractionHandler {
  private readonly response: string;

  /**
   * @param response - @range {json}
   */
  public constructor(response: unknown) {
    super();
    this.response = JSON.stringify(response);
  }

  public async handle({ operation }: InteractionHandlerInput): Promise<Representation> {
    return new BasicRepresentation(this.response, operation.target, APPLICATION_JSON);
  }
}
