import { promises as fsPromises } from 'fs';
import marked from 'marked';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import type { TemplateEngine } from '../../pods/generate/TemplateEngine';
import { TEXT_HTML, TEXT_MARKDOWN } from '../../util/ContentTypes';
import { resolveAssetPath } from '../../util/PathUtil';
import { readableToString } from '../../util/StreamUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts markdown data to HTML.
 * The generated HTML will be injected into the given template using the parameter `htmlBody`.
 * A standard markdown string will be converted to a <p> tag, so html and body tags should be part of the template.
 * In case the markdown body starts with a header (#), that value will also be used as `title` parameter.
 */
export class MarkdownToHtmlConverter extends TypedRepresentationConverter {
  private readonly engine: TemplateEngine;
  private readonly templatePath: string;

  public constructor(engine: TemplateEngine, templatePath: string) {
    super(TEXT_MARKDOWN, TEXT_HTML);
    this.engine = engine;
    this.templatePath = resolveAssetPath(templatePath);
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const markdown = await readableToString(representation.data);

    // See if there is a title we can use
    const match = /^\s*#+\s*([^\n]+)\n/u.exec(markdown);
    const title = match?.[1];

    const htmlBody = marked(markdown);

    const template = await fsPromises.readFile(this.templatePath, 'utf8');
    const html = this.engine.apply(template, { htmlBody, title });

    return new BasicRepresentation(html, representation.metadata, TEXT_HTML);
  }
}
