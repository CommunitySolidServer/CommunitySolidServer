import 'jest-rdf';
import type { NamedNode, Literal } from 'n3';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { addTemplateMetadata, cloneRepresentation, updateModifiedDate } from '../../../src/util/ResourceUtil';
import { CONTENT_TYPE_TERM, DC, SOLID_META, XSD } from '../../../src/util/Vocabularies';

describe('ResourceUtil', (): void => {
  let representation: Representation;

  beforeEach(async(): Promise<void> => {
    representation = new BasicRepresentation('data', 'metadata');
  });

  describe('#updateModifiedDate', (): void => {
    it('adds the given date without milliseconds as last modified date.', async(): Promise<void> => {
      const date = new Date();
      date.setMilliseconds(500);
      const metadata = new RepresentationMetadata();
      updateModifiedDate(metadata, date);
      const lastModified = metadata.get(DC.terms.modified);
      expect(lastModified?.termType).toBe('Literal');
      const lastModifiedDate = new Date(lastModified!.value);
      expect(date.getTime() - lastModifiedDate.getTime()).toBe(500);

      date.setMilliseconds(0);
      expect(lastModified?.value).toBe(date.toISOString());
      expect((lastModified as Literal).datatype).toEqualRdfTerm(XSD.terms.dateTime);
    });
  });

  describe('#addTemplateMetadata', (): void => {
    const filePath = '/templates/template.html.ejs';
    const contentType = 'text/html';

    it('stores the template metadata.', (): void => {
      const metadata = new RepresentationMetadata();
      addTemplateMetadata(metadata, filePath, contentType);
      const templateNode = metadata.get(SOLID_META.terms.template);
      expect(templateNode?.value).toBe(filePath);
      const quads = metadata.quads(templateNode as NamedNode, CONTENT_TYPE_TERM);
      expect(quads).toHaveLength(1);
      expect(quads[0].object.value).toBe(contentType);
    });
  });

  describe('#cloneRepresentation', (): void => {
    it('returns a clone of the passed representation.', async(): Promise<void> => {
      const res = await cloneRepresentation(representation);
      expect(res.binary).toBe(representation.binary);
      expect(res.metadata.identifier).toBe(representation.metadata.identifier);
      expect(res.metadata.contentType).toBe(representation.metadata.contentType);
    });

    it('ensures that original representation does not update when the clone is updated.', async(): Promise<void> => {
      const res = await cloneRepresentation(representation);
      res.metadata.contentType = 'typetype';
      expect(representation.metadata.contentType).not.toBe(res.metadata.contentType);
    });
  });
});
