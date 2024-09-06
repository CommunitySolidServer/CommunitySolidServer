import type { NamedNode, Term } from '@rdfjs/types';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ValuePreferences } from '../../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { readableToString } from '../../util/StreamUtil';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';
import { CONTENT_TYPE, CONTENT_TYPE_TERM, SOLID_META } from '../../util/Vocabularies';
import { getConversionTarget } from './ConversionUtil';
import { RepresentationConverter } from './RepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts JSON data by using it as input parameters for rendering a template.
 * The `extension` field can be used to only support a specific type of templates,
 * such as ".ejs" for EJS templates.
 *
 * To find the templates it expects the Representation metadata to contain `SOLID_META.template` triples,
 * with the objects being the template paths.
 * For each of those templates there also needs to be a CONTENT_TYPE triple
 * describing the content-type of that template.
 *
 * The output of the result depends on the content-type matched with the template.
 * In case JSON is the most preferred output type,
 * the input representation will be returned unless a JSON template is defined.
 */
export class DynamicJsonToTemplateConverter extends RepresentationConverter {
  private readonly templateEngine: TemplateEngine;

  public constructor(templateEngine: TemplateEngine) {
    super();
    this.templateEngine = templateEngine;
  }

  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    if (input.representation.metadata.contentType !== APPLICATION_JSON) {
      throw new NotImplementedHttpError('Only JSON data is supported');
    }

    const { identifier, representation, preferences } = input;

    // Can only handle this input if we can find a type to convert to
    const typeMap = this.constructTypeMap(identifier, representation);
    this.findType(typeMap, preferences.type);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    const { identifier, representation, preferences } = input;

    const typeMap = this.constructTypeMap(identifier, representation);
    const type = this.findType(typeMap, preferences.type);

    // No conversion needed if JSON is requested and there is no specific JSON template
    if (type === APPLICATION_JSON && typeMap[APPLICATION_JSON].length === 0) {
      return representation;
    }

    const contents = JSON.parse(await readableToString(representation.data)) as NodeJS.Dict<unknown>;

    const rendered = await this.templateEngine.handleSafe({ contents, template: { templateFile: typeMap[type] }});
    const metadata = new RepresentationMetadata(representation.metadata, { [CONTENT_TYPE]: type });

    return new BasicRepresentation(rendered, metadata);
  }

  /**
   * Uses the metadata of the Representation to create a map where each key is a content-type
   * and each value is the path of the corresponding template.
   */
  private constructTypeMap(identifier: ResourceIdentifier, representation: Representation): Record<string, string> {
    // Finds the templates in the metadata
    const templates: NamedNode[] = representation.metadata.quads(identifier.path, SOLID_META.terms.template)
      .map((quad): Term => quad.object)
      .filter((term: Term): boolean => term.termType === 'NamedNode') as NamedNode[];

    // This handler should only cover cases where templates are defined
    if (templates.length === 0) {
      throw new NotImplementedHttpError('No templates found.');
    }

    // Maps all content-types to their template
    const typeMap: Record<string, string> = {};
    for (const template of templates) {
      const types = representation.metadata.quads(template, CONTENT_TYPE_TERM).map((quad): string => quad.object.value);
      for (const type of types) {
        typeMap[type] = template.value;
      }
    }

    // Not using a template is always an option unless there is a specific JSON template
    if (!typeMap[APPLICATION_JSON]) {
      typeMap[APPLICATION_JSON] = '';
    }

    return typeMap;
  }

  /**
   * Finds the best content-type to convert to based on the provided templates and preferences.
   */
  private findType(typeMap: Record<string, string>, typePreferences: ValuePreferences = {}): string {
    const typeWeights = Object.fromEntries(Object.keys(typeMap).map((type: string): [ string, 1 ] => [ type, 1 ]));
    const type = getConversionTarget(typeWeights, typePreferences);
    if (!type) {
      throw new NotImplementedHttpError(
        `No templates found matching ${Object.keys(typePreferences).join(',')}, only ${Object.keys(typeMap).join(',')}`,
      );
    }
    return type;
  }
}
