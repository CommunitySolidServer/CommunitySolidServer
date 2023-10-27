import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { MarkdownToHtmlConverter } from '../../../../src/storage/conversion/MarkdownToHtmlConverter';
import { readableToString } from '../../../../src/util/StreamUtil';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';

describe('A MarkdownToHtmlConverter', (): void => {
  const identifier = { path: 'http://test.com/text' };
  const preferences = {};
  let templateEngine: TemplateEngine;
  let converter: MarkdownToHtmlConverter;

  beforeEach(async(): Promise<void> => {
    templateEngine = {
      handleSafe: jest.fn().mockResolvedValue('<html>'),
    } as any;
    converter = new MarkdownToHtmlConverter(templateEngine);
  });

  it('supports going from markdown to html.', async(): Promise<void> => {
    await expect(converter.getOutputTypes('text/markdown')).resolves.toEqual({ 'text/html': 1 });
  });

  it('converts markdown and inserts it in the template.', async(): Promise<void> => {
    const markdown = 'Text `code` more text.';
    const representation = new BasicRepresentation(markdown, 'text/markdown', true);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(templateEngine.handleSafe).toHaveBeenCalledTimes(1);
    expect(templateEngine.handleSafe).toHaveBeenLastCalledWith(
      { contents: { htmlBody: '<p>Text <code>code</code> more text.</p>\n' }},
    );
  });
});
