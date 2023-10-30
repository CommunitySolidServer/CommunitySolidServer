import 'jest-rdf';
import type { Readable } from 'node:stream';
import type { Literal, NamedNode } from 'n3';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { Conditions } from '../../../src/storage/conditions/Conditions';
import type { ETagHandler } from '../../../src/storage/conditions/ETagHandler';
import { NotModifiedHttpError } from '../../../src/util/errors/NotModifiedHttpError';
import type { Guarded } from '../../../src/util/GuardedStream';
import {
  addTemplateMetadata,
  assertReadConditions,
  cloneRepresentation,
  updateModifiedDate,
} from '../../../src/util/ResourceUtil';
import { CONTENT_TYPE_TERM, DC, HH, SOLID_META, XSD } from '../../../src/util/Vocabularies';

describe('ResourceUtil', (): void => {
  let representation: Representation;

  beforeEach(async(): Promise<void> => {
    representation = new BasicRepresentation('data', 'meta/data');
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
      res.metadata.contentType = 'type/type';
      expect(representation.metadata.contentType).not.toBe(res.metadata.contentType);
    });
  });

  describe('#assertReadConditions', (): void => {
    let data: jest.Mocked<Guarded<Readable>>;
    const eTagHandler: ETagHandler = {
      getETag: (): string => 'ETag',
      matchesETag: jest.fn(),
      sameResourceState: jest.fn(),
    };

    beforeEach(async(): Promise<void> => {
      data = {
        destroy: jest.fn(),
      } as any;
      representation.data = data;
      representation.metadata = new RepresentationMetadata();
    });

    it('adds the ETag to the representation if the conditions are undefined.', async(): Promise<void> => {
      expect((): any => assertReadConditions(representation, eTagHandler)).not.toThrow();
      expect(data.destroy).toHaveBeenCalledTimes(0);
      expect(representation.metadata.get(HH.terms.etag)?.value).toBe('ETag');
    });

    it('adds the ETag to the representation i if the conditions match.', async(): Promise<void> => {
      const conditions: Conditions = {
        matchesMetadata: (): boolean => true,
      };
      expect((): any => assertReadConditions(representation, eTagHandler, conditions)).not.toThrow();
      expect(data.destroy).toHaveBeenCalledTimes(0);
      expect(representation.metadata.get(HH.terms.etag)?.value).toBe('ETag');
    });

    it('throws a NotModifiedHttpError if the conditions do not match.', async(): Promise<void> => {
      const conditions: Conditions = {
        matchesMetadata: (): boolean => false,
      };
      let error: unknown;
      try {
        assertReadConditions(representation, eTagHandler, conditions);
      } catch (err: unknown) {
        error = err;
      }
      expect(NotModifiedHttpError.isInstance(error)).toBe(true);
      expect((error as NotModifiedHttpError).metadata.get(HH.terms.etag)?.value).toBe('ETag');
      expect(data.destroy).toHaveBeenCalledTimes(1);
      expect(representation.metadata.get(HH.terms.etag)).toBeUndefined();
    });
  });
});
