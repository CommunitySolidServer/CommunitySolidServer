import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import type { InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';

/**
 * Abstract implementation for handlers that always return a fixed JSON view on a GET.
 * POST requests are passed to an abstract function.
 * Other methods will be rejected.
 */
export abstract class BaseInteractionHandler extends InteractionHandler {
  private readonly view: string;

  protected constructor(view: Record<string, unknown>) {
    super();
    this.view = JSON.stringify(view);
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    await super.canHandle(input);
    const { method } = input.operation;
    if (method !== 'GET' && method !== 'POST') {
      throw new MethodNotAllowedHttpError([ method ], 'Only GET/POST requests are supported.');
    }
  }

  public async handle(input: InteractionHandlerInput): Promise<Representation> {
    switch (input.operation.method) {
      case 'GET': return this.handleGet(input);
      case 'POST': return this.handlePost(input);
      default: throw new MethodNotAllowedHttpError([ input.operation.method ]);
    }
  }

  /**
   * Returns a fixed JSON view.
   * @param input - Input parameters, only the operation target is used.
   */
  protected async handleGet(input: InteractionHandlerInput): Promise<Representation> {
    return new BasicRepresentation(this.view, input.operation.target, APPLICATION_JSON);
  }

  /**
   * Function that will be called for POST requests.
   * Input data remains unchanged.
   * @param input - Input operation and OidcInteraction if it exists.
   */
  protected abstract handlePost(input: InteractionHandlerInput): Promise<Representation>;
}
