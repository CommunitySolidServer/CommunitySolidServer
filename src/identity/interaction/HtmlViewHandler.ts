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
 *
 * Templates will receive the parameter `idpIndex` in their context pointing to the root index URL of the IDP API
 * and an `authenticating` parameter indicating if this is an active OIDC interaction.
 */
export class HtmlViewHandler extends InteractionHandler {
  private readonly idpIndex: string;
  private readonly templateEngine: TemplateEngine;
  private readonly templates: Record<string, string>;

  public constructor(index: InteractionRoute, templateEngine: TemplateEngine,
    templates: Record<string, InteractionRoute>) {
    super();
    this.idpIndex = index.getPath();
    this.templateEngine = templateEngine;
    this.templates = Object.fromEntries(
      Object.entries(templates).map(([ template, route ]): [ string, string ] => [ route.getPath(), template ]),
    );
  }

  public async canHandle({ operation }: InteractionHandlerInput): Promise<void> {
    if (operation.method !== 'GET') {
      throw new MethodNotAllowedHttpError([ operation.method ]);
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

  public async handle({ operation, oidcInteraction }: InteractionHandlerInput): Promise<Representation> {
    const template = this.templates[operation.target.path];
    const contents = { idpIndex: this.idpIndex, authenticating: Boolean(oidcInteraction) };
    const result = await this.templateEngine.render(contents, { templateFile: template });
    return new BasicRepresentation(result, operation.target, TEXT_HTML);
  }
}
