import type { Operation } from '../../../http/Operation';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { createErrorMessage, isError } from '../../../util/errors/ErrorUtil';
import { InternalServerError } from '../../../util/errors/InternalServerError';
import { trimTrailingSlashes } from '../../../util/PathUtil';
import type {
  InteractionHandler,
  Interaction,
} from '../email-password/handler/InteractionHandler';
import type { InteractionRoute, TemplatedInteractionResult } from './InteractionRoute';

/**
 * Default implementation of the InteractionRoute.
 * See function comments for specifics.
 */
export class BasicInteractionRoute implements InteractionRoute {
  public readonly route: RegExp;
  public readonly handler: InteractionHandler;
  public readonly viewTemplates: Record<string, string>;
  public readonly prompt?: string;
  public readonly responseTemplates: Record<string, string>;
  public readonly controls: Record<string, string>;

  /**
   * @param route - Regex to match this route.
   * @param viewTemplates - Templates to render on GET requests.
   *                        Keys are content-types, values paths to a template.
   * @param handler - Handler to call on POST requests.
   * @param prompt - In case of requests to the IDP entry point, the session prompt will be compared to this.
   * @param responseTemplates - Templates to render as a response to POST requests when required.
   *                            Keys are content-types, values paths to a template.
   * @param controls - Controls to add to the response JSON.
   *                   The keys will be copied and the values will be converted to full URLs.
   */
  public constructor(route: string,
    viewTemplates: Record<string, string>,
    handler: InteractionHandler,
    prompt?: string,
    responseTemplates: Record<string, string> = {},
    controls: Record<string, string> = {}) {
    this.route = new RegExp(route, 'u');
    this.viewTemplates = viewTemplates;
    this.handler = handler;
    this.prompt = prompt;
    this.responseTemplates = responseTemplates;
    this.controls = controls;
  }

  /**
   * Returns the stored controls.
   */
  public getControls(): Record<string, string> {
    return this.controls;
  }

  /**
   * Checks support by comparing the prompt if the path targets the base URL,
   * and otherwise comparing with the stored route regular expression.
   */
  public supportsPath(path: string, prompt?: string): boolean {
    // In case the request targets the IDP entry point the prompt determines where to go
    if (trimTrailingSlashes(path).length === 0 && prompt) {
      return this.prompt === prompt;
    }
    return this.route.test(path);
  }

  /**
   * GET requests return a default response result.
   * POST requests return the InteractionHandler result.
   * InteractionHandler errors will be converted into response results.
   *
   * All results will be appended with the matching template paths.
   *
   * Will error for other methods
   */
  public async handleOperation(operation: Operation, oidcInteraction?: Interaction):
  Promise<TemplatedInteractionResult> {
    switch (operation.method) {
      case 'GET':
        return { type: 'response', templateFiles: this.viewTemplates };
      case 'POST':
        try {
          const result = await this.handler.handleSafe({ operation, oidcInteraction });
          return { ...result, templateFiles: this.responseTemplates };
        } catch (err: unknown) {
          const error = isError(err) ? err : new InternalServerError(createErrorMessage(err));
          // Potentially render the error in the view
          return { type: 'error', error, templateFiles: this.viewTemplates };
        }
      default:
        throw new BadRequestHttpError(`Unsupported request: ${operation.method} ${operation.target.path}`);
    }
  }
}
