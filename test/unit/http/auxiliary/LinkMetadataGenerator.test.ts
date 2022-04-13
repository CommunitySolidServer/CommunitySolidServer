import { DataFactory } from 'n3';
import type { AuxiliaryIdentifierStrategy } from '../../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import { LinkMetadataGenerator } from '../../../../src/http/auxiliary/LinkMetadataGenerator';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { SOLID_META } from '../../../../src/util/Vocabularies';

describe('A LinkMetadataGenerator', (): void => {
  const link = 'link';
  const subjectId: ResourceIdentifier = { path: 'http://test.com/foo' };
  const auxiliaryId: ResourceIdentifier = { path: 'http://test.com/foo.dummy' };
  let generator: LinkMetadataGenerator;

  beforeEach(async(): Promise<void> => {
    const strategy = {
      getAuxiliaryIdentifier: (identifier: ResourceIdentifier): ResourceIdentifier =>
        ({ path: `${identifier.path}.dummy` }),
      isAuxiliaryIdentifier: (identifier: ResourceIdentifier): boolean => identifier.path.endsWith('.dummy'),
      getSubjectIdentifier: (identifier: ResourceIdentifier): ResourceIdentifier =>
        ({ path: identifier.path.slice(0, -'.dummy'.length) }),
    } as AuxiliaryIdentifierStrategy;
    generator = new LinkMetadataGenerator(link, strategy);
  });

  it('can handle all metadata.', async(): Promise<void> => {
    await expect(generator.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('stores no metadata if the input is a subject resource.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata(auxiliaryId);
    await expect(generator.handle(metadata)).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('uses the stored link to add metadata for subject resources.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata(subjectId);
    await expect(generator.handle(metadata)).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.get(DataFactory.namedNode(link))?.value).toBe(auxiliaryId.path);
    expect(metadata.getAll(DataFactory.namedNode(link), SOLID_META.terms.ResponseMetadata)).toHaveLength(1);
  });
});
