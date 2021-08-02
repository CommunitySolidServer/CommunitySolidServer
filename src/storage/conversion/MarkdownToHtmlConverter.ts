import marked from 'marked';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import { TEXT_HTML, TEXT_MARKDOWN } from '../../util/ContentTypes';
import { readableToString } from '../../util/StreamUtil';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts Markdown data to HTML.
 * The generated HTML will be injected into the given template using the parameter `htmlBody`.
 * A standard Markdown string will be converted to a <p> tag, so html and body tags should be part of the template.
 * In case the Markdown body starts with a header (#), that value will also be used as `title` parameter.
 */
export class MarkdownToHtmlConverter extends TypedRepresentationConverter {
  private readonly templateEngine: TemplateEngine;

  public constructor(templateEngine: TemplateEngine) {
    super(TEXT_MARKDOWN, TEXT_HTML);
    this.templateEngine = templateEngine;
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const markdown = await readableToString(representation.data);
    const htmlBody = marked(markdown);
    const html = await this.templateEngine.render({ htmlBody });

    return new BasicRepresentation(html, representation.metadata, TEXT_HTML);
  }
}
