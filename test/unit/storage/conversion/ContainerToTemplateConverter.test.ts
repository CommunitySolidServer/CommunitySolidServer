import { DataFactory } from 'n3';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { ContainerToTemplateConverter } from '../../../../src/storage/conversion/ContainerToTemplateConverter';
import { SingleRootIdentifierStrategy } from '../../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { readableToString } from '../../../../src/util/StreamUtil';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';
import { LDP, RDF } from '../../../../src/util/Vocabularies';

const { namedNode: nn, quad } = DataFactory;

describe('A ContainerToTemplateConverter', (): void => {
  const preferences = {};
  const identifierStrategy = new SingleRootIdentifierStrategy('http://test.com/');
  let templateEngine: jest.Mocked<TemplateEngine>;
  let converter: ContainerToTemplateConverter;

  beforeEach(async(): Promise<void> => {
    templateEngine = {
      handleSafe: jest.fn().mockResolvedValue('<html>'),
    } as any;
    converter = new ContainerToTemplateConverter(templateEngine, 'text/html', identifierStrategy);
  });

  it('supports containers.', async(): Promise<void> => {
    const container = { path: 'http://test.com/foo/bar/container/' };
    const representation = new BasicRepresentation([], 'internal/quads', false);
    await expect(converter.canHandle({ identifier: container, representation, preferences }))
      .resolves.toBeUndefined();
  });

  it('does not support documents.', async(): Promise<void> => {
    const document = { path: 'http://test.com/foo/bar/document' };
    const representation = new BasicRepresentation([], 'internal/quads', false);
    await expect(converter.canHandle({ identifier: document, representation, preferences }))
      .rejects.toThrow('Can only convert containers');
  });

  it('calls the template with the contained resources.', async(): Promise<void> => {
    const container = { path: 'http://test.com/foo/bar/my-container/' };
    const representation = new BasicRepresentation([
      quad(nn(container.path), RDF.terms.type, LDP.terms.BasicContainer),
      quad(nn(container.path), LDP.terms.contains, nn(`${container.path}b`)),
      quad(nn(container.path), LDP.terms.contains, nn(`${container.path}a`)),
      quad(nn(container.path), LDP.terms.contains, nn(`${container.path}a`)),
      quad(nn(container.path), LDP.terms.contains, nn(`${container.path}c%20c`)),
      quad(nn(container.path), LDP.terms.contains, nn(`${container.path}d/`)),
      quad(nn(`${container.path}d/`), LDP.terms.contains, nn(`${container.path}d`)),
    ], 'internal/quads', false);
    const converted = await converter.handle({ identifier: container, representation, preferences });

    expect(converted.binary).toBe(true);
    expect(converted.metadata.contentType).toBe('text/html');
    await expect(readableToString(converted.data)).resolves.toBe('<html>');

    expect(templateEngine.handleSafe).toHaveBeenCalledTimes(1);
    expect(templateEngine.handleSafe).toHaveBeenCalledWith({
      contents: {
        identifier: container.path,
        name: 'my-container',
        container: true,
        children: [
          {
            identifier: `${container.path}d/`,
            name: 'd',
            container: true,
          },
          {
            identifier: `${container.path}a`,
            name: 'a',
            container: false,
          },
          {
            identifier: `${container.path}b`,
            name: 'b',
            container: false,
          },
          {
            identifier: `${container.path}c%20c`,
            name: 'c c',
            container: false,
          },
        ],
        parents: [
          {
            identifier: 'http://test.com/',
            name: 'test.com',
            container: true,
          },
          {
            identifier: 'http://test.com/foo/',
            name: 'foo',
            container: true,
          },
          {
            identifier: 'http://test.com/foo/bar/',
            name: 'bar',
            container: true,
          },
        ],
      },
    });
  });

  it('converts the root container.', async(): Promise<void> => {
    const container = { path: 'http://test.com/' };
    const representation = new BasicRepresentation([
      quad(nn(container.path), RDF.terms.type, LDP.terms.BasicContainer),
      quad(nn(container.path), LDP.terms.contains, nn(`${container.path}a`)),
      quad(nn(container.path), LDP.terms.contains, nn(`${container.path}b`)),
      quad(nn(container.path), LDP.terms.contains, nn(`${container.path}c`)),
    ], 'internal/quads', false);
    await converter.handle({ identifier: container, representation, preferences });

    expect(templateEngine.handleSafe).toHaveBeenCalledTimes(1);
    expect(templateEngine.handleSafe).toHaveBeenCalledWith({
      contents: {
        identifier: container.path,
        name: 'test.com',
        container: true,
        children: expect.objectContaining({ length: 3 }),
        parents: [],
      },
    });
  });

  it('converts an improperly named container.', async(): Promise<void> => {
    const container = { path: 'http//test.com/foo/bar' };
    const representation = new BasicRepresentation([], 'internal/quads', false);
    jest.spyOn(identifierStrategy, 'isRootContainer').mockReturnValueOnce(true);
    await converter.handle({ identifier: container, representation, preferences });

    expect(templateEngine.handleSafe).toHaveBeenCalledTimes(1);
    expect(templateEngine.handleSafe).toHaveBeenCalledWith({
      contents: {
        identifier: container.path,
        name: container.path,
        container: true,
        children: [],
        parents: [],
      },
    });
  });
});
