import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { cleanPreferences, getTypeWeight } from '../../storage/conversion/ConversionUtil';
import { APPLICATION_JSON, TEXT_HTML } from '../../util/ContentTypes';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';
import type { InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';
import type { InteractionRoute } from './routing/InteractionRoute';

/**
 * Stores the HTML templates associated with specific InteractionRoutes.
 * Template keys should be file paths to the templates,
 * values should be the corresponding routes.
 *
 * Will only handle GET operations for which there is a matching template if HTML is more preferred than JSON.
 * Reason for doing it like this instead of a standard content negotiation flow
 * is because we only want to return the HTML pages on GET requests. *
 */
export class HtmlViewHandler extends InteractionHandler {
  private readonly templateEngine: TemplateEngine;
  private readonly templates: Record<string, string>;

  public constructor(templateEngine: TemplateEngine, templates: Record<string, InteractionRoute>) {
    super();
    this.templateEngine = templateEngine;
    this.templates = Object.fromEntries(
      Object.entries(templates).map(([ template, route ]): [ string, string ] => [ route.getPath(), template ]),
    );
  }

  public async canHandle({ operation }: InteractionHandlerInput): Promise<void> {
    if (operation.method !== 'GET') {
      throw new MethodNotAllowedHttpError();
    }
    if (!this.templates[operation.target.path]) {
      throw new NotFoundHttpError();
    }
    const preferences = cleanPreferences(operation.preferences.type);
    const htmlWeight = getTypeWeight(TEXT_HTML, preferences);
    const jsonWeight = getTypeWeight(APPLICATION_JSON, preferences);
    if (jsonWeight >= htmlWeight) {
      throw new NotImplementedHttpError('HTML views are only returned when they are preferred.');
    }
  }

  public async handle({ operation }: InteractionHandlerInput): Promise<Representation> {
    const template = this.templates[operation.target.path];
    const result = await this.templateEngine.render({}, { templateFile: template });
    return new BasicRepresentation(result, operation.target, TEXT_HTML);
  }
}
