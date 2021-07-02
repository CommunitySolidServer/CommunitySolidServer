import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import type { TemplateEngine } from '../../../../src/pods/generate/TemplateEngine';
import { MarkdownToHtmlConverter } from '../../../../src/storage/conversion/MarkdownToHtmlConverter';
import { readableToString } from '../../../../src/util/StreamUtil';
import { mockFs } from '../../../util/Util';

jest.mock('fs');

describe('A MarkdownToHtmlConverter', (): void => {
  let cache: { data: any };
  const identifier = { path: 'http://test.com/text' };
  const templatePath = '/templates/error.template';
  const preferences = {};
  let engine: TemplateEngine;
  let converter: MarkdownToHtmlConverter;

  beforeEach(async(): Promise<void> => {
    cache = mockFs('/templates');
    cache.data['error.template'] = '{{ template }}';
    engine = {
      apply: jest.fn().mockReturnValue('<html>'),
    };

    converter = new MarkdownToHtmlConverter(engine, templatePath);
  });

  it('supports going from markdown to html.', async(): Promise<void> => {
    await expect(converter.getInputTypes()).resolves.toEqual({ 'text/markdown': 1 });
    await expect(converter.getOutputTypes()).resolves.toEqual({ 'text/html': 1 });
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
    expect(engine.apply).toHaveBeenCalledTimes(1);
    expect(engine.apply).toHaveBeenLastCalledWith(
      '{{ template }}', { htmlBody: '<p>Text <code>code</code> more text.</p>\n' },
    );
  });

  it('uses the main markdown header as title if there is one.', async(): Promise<void> => {
    const markdown = '# title text\nmore text';
    const representation = new BasicRepresentation(markdown, 'text/markdown', true);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(engine.apply).toHaveBeenCalledTimes(1);
    expect(engine.apply).toHaveBeenLastCalledWith(
      '{{ template }}', { htmlBody: '<h1 id="title-text">title text</h1>\n<p>more text</p>\n', title: 'title text' },
    );
  });
});
