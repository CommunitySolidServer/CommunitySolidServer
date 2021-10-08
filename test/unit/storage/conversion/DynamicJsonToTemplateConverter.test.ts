import { DataFactory } from 'n3';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import type { RepresentationPreferences } from '../../../../src/http/representation/RepresentationPreferences';
import { DynamicJsonToTemplateConverter } from '../../../../src/storage/conversion/DynamicJsonToTemplateConverter';
import type { RepresentationConverterArgs } from '../../../../src/storage/conversion/RepresentationConverter';
import { readableToString } from '../../../../src/util/StreamUtil';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';
import { CONTENT_TYPE_TERM, SOLID_META } from '../../../../src/util/Vocabularies';
import namedNode = DataFactory.namedNode;

describe('A DynamicJsonToTemplateConverter', (): void => {
  const templateFile = '/path/to/template.html.ejs';
  const identifier = { path: 'http://test.com/foo' };
  let representation: Representation;
  let preferences: RepresentationPreferences;
  let input: RepresentationConverterArgs;
  let templateEngine: jest.Mocked<TemplateEngine>;
  let converter: DynamicJsonToTemplateConverter;

  beforeEach(async(): Promise<void> => {
    representation = new BasicRepresentation('{ "json": true }', identifier, 'application/json');

    // Create dummy template metadata
    const templateNode = namedNode(templateFile);
    representation.metadata.add(SOLID_META.terms.template, templateNode);
    representation.metadata.addQuad(templateNode, CONTENT_TYPE_TERM, 'text/html');

    preferences = { type: { 'text/html': 1 }};

    input = { identifier, representation, preferences };

    templateEngine = {
      render: jest.fn().mockReturnValue(Promise.resolve('<html>')),
    };
    converter = new DynamicJsonToTemplateConverter(templateEngine);
  });

  it('can only handle JSON data.', async(): Promise<void> => {
    representation.metadata.contentType = 'text/plain';
    await expect(converter.canHandle(input)).rejects.toThrow('Only JSON data is supported');
  });

  it('can only handle preferences matching the templates found.', async(): Promise<void> => {
    input.preferences = { type: { 'text/plain': 1 }};
    await expect(converter.canHandle(input)).rejects.toThrow('No templates found matching text/plain, only text/html');
  });

  it('can handle JSON input with templates matching the preferences.', async(): Promise<void> => {
    await expect(converter.canHandle(input)).resolves.toBeUndefined();
  });

  it('uses the input JSON as parameters for the matching template.', async(): Promise<void> => {
    const result = await converter.handle(input);
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    expect(templateEngine.render).toHaveBeenCalledTimes(1);
    expect(templateEngine.render).toHaveBeenLastCalledWith({ json: true }, { templateFile });
  });

  it('supports missing type preferences.', async(): Promise<void> => {
    input.preferences = {};
    const result = await converter.handle(input);
    await expect(readableToString(result.data)).resolves.toBe('<html>');
  });
});
