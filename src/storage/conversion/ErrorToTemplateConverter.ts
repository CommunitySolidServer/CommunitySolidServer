import assert from 'node:assert';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { INTERNAL_ERROR } from '../../util/ContentTypes';
import type { HttpError } from '../../util/errors/HttpError';
import { extractErrorTerms } from '../../util/errors/HttpErrorUtil';
import { resolveModulePath } from '../../util/PathUtil';
import { getSingleItem } from '../../util/StreamUtil';
import { isValidFileName } from '../../util/StringUtil';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';
import { BaseTypedRepresentationConverter } from './BaseTypedRepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

// Fields optional due to https://github.com/LinkedSoftwareDependencies/Components.js/issues/20
export interface TemplateOptions {
  mainTemplatePath?: string;
  codeTemplatesPath?: string;
  extension?: string;
  contentType?: string;
}

const DEFAULT_TEMPLATE_OPTIONS: TemplateOptions = {
  mainTemplatePath: resolveModulePath('templates/error/main.md.hbs'),
  codeTemplatesPath: resolveModulePath('templates/error/descriptions/'),
  extension: '.md.hbs',
  contentType: 'text/markdown',
};

/**
 * Serializes an Error by filling in the provided template.
 * Content-type is based on the constructor parameter.
 *
 * In case the input Error has an `errorCode` value,
 * the converter will look in the `descriptions` for a file
 * with the exact same name as that error code + `extension`.
 * The templating engine will then be applied to that file.
 * That result will be passed as an additional parameter to the main templating call,
 * using the variable `codeMessage`.
 */
export class ErrorToTemplateConverter extends BaseTypedRepresentationConverter {
  private readonly templateEngine: TemplateEngine;
  private readonly mainTemplatePath: string;
  private readonly codeTemplatesPath: string;
  private readonly extension: string;
  private readonly contentType: string;

  public constructor(templateEngine: TemplateEngine, templateOptions?: TemplateOptions) {
    super(INTERNAL_ERROR, templateOptions?.contentType ?? DEFAULT_TEMPLATE_OPTIONS.contentType!);
    // Workaround for https://github.com/LinkedSoftwareDependencies/Components.js/issues/20
    if (!templateOptions || Object.keys(templateOptions).length === 0) {
      templateOptions = DEFAULT_TEMPLATE_OPTIONS;
    }
    this.templateEngine = templateEngine;
    this.mainTemplatePath = templateOptions.mainTemplatePath!;
    this.codeTemplatesPath = templateOptions.codeTemplatesPath!;
    this.extension = templateOptions.extension!;
    this.contentType = templateOptions.contentType!;
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const error = await getSingleItem(representation.data) as HttpError;

    // Render the error description using an error-specific template
    let description: string | undefined;
    try {
      const templateFile = `${error.errorCode}${this.extension}`;
      assert(isValidFileName(templateFile), 'Invalid error template name');
      // Filter out the error terms to pass to the template
      description = await this.templateEngine.handleSafe({
        contents: extractErrorTerms(error.metadata),
        template: { templateFile, templatePath: this.codeTemplatesPath },
      });
    } catch {
      // In case no template is found, or rendering errors, we still want to convert
    }

    // Render the main template, embedding the rendered error description
    const { name, message, stack, cause } = error;
    const contents = { name, message, stack, description, cause };
    const rendered = await this.templateEngine
      .handleSafe({ contents, template: { templateFile: this.mainTemplatePath }});

    return new BasicRepresentation(rendered, representation.metadata, this.contentType);
  }
}
