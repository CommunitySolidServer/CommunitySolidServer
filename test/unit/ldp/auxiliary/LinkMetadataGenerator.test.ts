import type { AuxiliaryIdentifierStrategy } from '../../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import { LinkMetadataGenerator } from '../../../../src/ldp/auxiliary/LinkMetadataGenerator';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { SOLID_META } from '../../../../src/util/Vocabularies';

describe('A LinkMetadataGenerator', (): void => {
  const link = 'link';
  const associatedId: ResourceIdentifier = { path: 'http://test.com/foo' };
  const auxiliaryId: ResourceIdentifier = { path: 'http://test.com/foo.dummy' };
  let generator: LinkMetadataGenerator;

  beforeEach(async(): Promise<void> => {
    const strategy = {
      getAuxiliaryIdentifier: (identifier: ResourceIdentifier): ResourceIdentifier =>
        ({ path: `${identifier.path}.dummy` }),
      isAuxiliaryIdentifier: (identifier: ResourceIdentifier): boolean => identifier.path.endsWith('.dummy'),
      getAssociatedIdentifier: (identifier: ResourceIdentifier): ResourceIdentifier =>
        ({ path: identifier.path.slice(0, -'.dummy'.length) }),
    } as AuxiliaryIdentifierStrategy;
    generator = new LinkMetadataGenerator(link, strategy);
  });

  it('can handle all metadata.', async(): Promise<void> => {
    await expect(generator.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('stores no metadata if the input is an associated resource.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata(auxiliaryId);
    await expect(generator.handle(metadata)).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('uses the stored link to add metadata for associated resources.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata(associatedId);
    await expect(generator.handle(metadata)).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.get(link)?.value).toBe(auxiliaryId.path);
    expect(metadata.getAll(link, SOLID_META.terms.ResponseMetadata)).toHaveLength(1);
  });
});
