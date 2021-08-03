import assert from 'assert';
import arrayifyStream from 'arrayify-stream';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import { INTERNAL_ERROR } from '../../util/ContentTypes';
import { HttpError } from '../../util/errors/HttpError';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { modulePathPlaceholder } from '../../util/PathUtil';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

// Fields optional due to https://github.com/LinkedSoftwareDependencies/Components.js/issues/20
export interface TemplateOptions {
  mainTemplatePath?: string;
  codeTemplatesPath?: string;
  extension?: string;
  contentType?: string;
}

const DEFAULT_TEMPLATE_OPTIONS: TemplateOptions = {
  mainTemplatePath: `${modulePathPlaceholder}templates/error/main.md.hbs`,
  codeTemplatesPath: `${modulePathPlaceholder}templates/error/descriptions/`,
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
export class ErrorToTemplateConverter extends TypedRepresentationConverter {
  private readonly templateEngine: TemplateEngine;
  private readonly mainTemplatePath: string;
  private readonly codeTemplatesPath: string;
  private readonly extension: string;
  private readonly contentType: string;

  public constructor(templateEngine: TemplateEngine, templateOptions?: TemplateOptions) {
    super(INTERNAL_ERROR, templateOptions?.contentType ?? DEFAULT_TEMPLATE_OPTIONS.contentType);
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
    // Obtain the error from the representation stream
    const errors = await arrayifyStream(representation.data);
    if (errors.length !== 1) {
      throw new InternalServerError('Only single errors are supported.');
    }
    const error = errors[0] as Error;

    // Render the error description using an error-specific template
    let description: string | undefined;
    if (HttpError.isInstance(error)) {
      try {
        const templateFile = `${error.errorCode}${this.extension}`;
        assert(/^[\w.-]+$/u.test(templateFile), 'Invalid error template name');
        description = await this.templateEngine.render(error.details ?? {},
          { templateFile, templatePath: this.codeTemplatesPath });
      } catch {
        // In case no template is found, or rendering errors, we still want to convert
      }
    }

    // Render the main template, embedding the rendered error description
    const { name, message, stack } = error;
    const variables = { name, message, stack, description };
    const rendered = await this.templateEngine.render(variables, { templateFile: this.mainTemplatePath });

    return new BasicRepresentation(rendered, representation.metadata, this.contentType);
  }
}
