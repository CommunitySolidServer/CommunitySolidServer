import { promises as fsPromises } from 'fs';
import arrayifyStream from 'arrayify-stream';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import type { TemplateEngine } from '../../pods/generate/TemplateEngine';
import { INTERNAL_ERROR } from '../../util/ContentTypes';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { resolveAssetPath } from '../../util/PathUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Serializes an Error by filling in the provided template.
 * Content-type is based on the constructor parameter.
 */
export class ErrorToTemplateConverter extends TypedRepresentationConverter {
  private readonly engine: TemplateEngine;
  private readonly templatePath: string;
  private readonly contentType: string;

  public constructor(engine: TemplateEngine, templatePath: string, contentType: string) {
    super(INTERNAL_ERROR, contentType);
    this.engine = engine;
    this.templatePath = resolveAssetPath(templatePath);
    this.contentType = contentType;
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const errors = await arrayifyStream(representation.data);
    if (errors.length !== 1) {
      throw new InternalServerError('Only single errors are supported.');
    }
    const error = errors[0] as Error;

    // Render the template
    const { name, message, stack } = error;
    const variables = { name, message, stack };
    const template = await fsPromises.readFile(this.templatePath, 'utf8');
    const html = this.engine.apply(template, variables);

    return new BasicRepresentation(html, representation.metadata, this.contentType);
  }
}
