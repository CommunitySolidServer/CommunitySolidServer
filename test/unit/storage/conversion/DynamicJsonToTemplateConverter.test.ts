import { DataFactory } from 'n3';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { RepresentationPreferences } from '../../../../src/http/representation/RepresentationPreferences';
import { DynamicJsonToTemplateConverter } from '../../../../src/storage/conversion/DynamicJsonToTemplateConverter';
import type { RepresentationConverterArgs } from '../../../../src/storage/conversion/RepresentationConverter';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
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
      handleSafe: jest.fn().mockResolvedValue('<html>'),
    } as any;
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

  it('rejects JSON input if no templates are defined.', async(): Promise<void> => {
    preferences.type = { 'application/json': 1 };
    representation.metadata = new RepresentationMetadata('application/json');
    await expect(converter.canHandle(input)).rejects.toThrow(NotImplementedHttpError);
  });

  it('uses the input JSON as parameters for the matching template.', async(): Promise<void> => {
    const result = await converter.handle(input);
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    expect(templateEngine.handleSafe).toHaveBeenCalledTimes(1);
    expect(templateEngine.handleSafe).toHaveBeenLastCalledWith({ contents: { json: true }, template: { templateFile }});
  });

  it('supports missing type preferences.', async(): Promise<void> => {
    input.preferences = {};
    const result = await converter.handle(input);
    await expect(readableToString(result.data)).resolves.toBe('<html>');
  });

  it('returns the input representation if JSON is preferred.', async(): Promise<void> => {
    input.preferences.type = { 'application/json': 1, 'text/html': 0.5 };
    await expect(converter.handle(input)).resolves.toBe(input.representation);
  });

  it('still converts if JSON is preferred but there is a JSON template.', async(): Promise<void> => {
    input.preferences.type = { 'application/json': 1 };
    const templateNode = namedNode(templateFile);
    representation.metadata.add(SOLID_META.terms.template, templateNode);
    representation.metadata.addQuad(templateNode, CONTENT_TYPE_TERM, 'application/json');
    const result = await converter.handle(input);
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(result.metadata.contentType).toBe('application/json');
  });
});
