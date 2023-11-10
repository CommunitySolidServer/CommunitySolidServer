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
 * Used to link file paths and URLs together.
 * The reason we use a separate object instead of a key/value Record,
 * is that this makes it easier to override the values in Components.js,
 * which can be useful if someone wants to replace the HTML for certain URLs.
 */
export class HtmlViewEntry {
  public constructor(
    public readonly route: InteractionRoute,
    public readonly filePath: string,
  ) {}
}

/**
 * Stores the HTML templates associated with specific InteractionRoutes.
 *
 * This class will only handle GET operations for which there is a matching template,
 * if HTML is more preferred than JSON.
 * The reason for doing it like this instead of a standard content negotiation flow,
 * is because we only want to return the HTML pages on GET requests.
 *
 * Templates will receive the parameter `idpIndex` in their context pointing to the root index URL of the IDP API
 * and an `authenticating` parameter indicating if this is an active OIDC interaction.
 */
export class HtmlViewHandler extends InteractionHandler {
  private readonly idpIndex: string;
  private readonly templateEngine: TemplateEngine;
  private readonly templates: HtmlViewEntry[];

  public constructor(index: InteractionRoute, templateEngine: TemplateEngine, templates: HtmlViewEntry[]) {
    super();
    this.idpIndex = index.getPath();
    this.templateEngine = templateEngine;
    this.templates = templates;
  }

  public async canHandle({ operation }: InteractionHandlerInput): Promise<void> {
    if (operation.method !== 'GET') {
      throw new MethodNotAllowedHttpError([ operation.method ]);
    }

    const preferences = cleanPreferences(operation.preferences.type);
    const htmlWeight = getTypeWeight(TEXT_HTML, preferences);
    const jsonWeight = getTypeWeight(APPLICATION_JSON, preferences);
    if (jsonWeight >= htmlWeight) {
      throw new NotImplementedHttpError('HTML views are only returned when they are preferred.');
    }

    // Will throw error if no match is found
    this.findTemplate(operation.target.path);
  }

  public async handle({ operation, oidcInteraction }: InteractionHandlerInput): Promise<Representation> {
    const template = this.findTemplate(operation.target.path);
    const contents = { idpIndex: this.idpIndex, authenticating: Boolean(oidcInteraction) };
    const result = await this.templateEngine.handleSafe({ contents, template: { templateFile: template }});
    return new BasicRepresentation(result, operation.target, TEXT_HTML);
  }

  /**
   * Finds the template for the given URL.
   */
  private findTemplate(target: string): string {
    for (const template of this.templates) {
      if (template.route.matchPath(target)) {
        return template.filePath;
      }
    }
    throw new NotFoundHttpError();
  }
}
