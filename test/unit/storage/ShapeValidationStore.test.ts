import { DataFactory } from 'n3';
import type { AuxiliaryStrategy } from '../../../src/http/auxiliary/AuxiliaryStrategy';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import type { RepresentationConverter } from '../../../src/storage/conversion/RepresentationConverter';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { ShapeValidationStore } from '../../../src/storage/ShapeValidationStore';
import type { ShapeValidator } from '../../../src/storage/validators/ShapeValidator';
import { INTERNAL_QUADS } from '../../../src/util/ContentTypes';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';
import { LDP } from '../../../src/util/Vocabularies';
import { SimpleSuffixStrategy } from '../../util/SimpleSuffixStrategy';
import namedNode = DataFactory.namedNode;
import quad = DataFactory.quad;

describe('ShapeValidationStore', (): void => {
  let validator: ShapeValidator;
  let metadataStrategy: AuxiliaryStrategy;
  let source: ResourceStore;
  let converter: RepresentationConverter;
  const root = 'http://test.com/';
  const identifierStrategy = new SingleRootIdentifierStrategy(root);
  const metaSuffix = '.meta';
  let store: ShapeValidationStore;

  beforeEach((): void => {
    source = {
      getRepresentation: jest.fn(async(): Promise<any> => new BasicRepresentation()),
      addResource: jest.fn(async(): Promise<any> => 'add'),
      setRepresentation: jest.fn(async(): Promise<any> => 'set'),
    } as unknown as ResourceStore;

    metadataStrategy = new SimpleSuffixStrategy(metaSuffix);
    converter = {
      handleSafe: jest.fn(),
      canHandle: jest.fn(),
      handle: jest.fn(),
    };
    validator = {
      handleSafe: jest.fn(),
      canHandle: jest.fn(),
      handle: jest.fn(),
    };
    store = new ShapeValidationStore(source, identifierStrategy, metadataStrategy, converter, validator);
  });

  describe('adding a Resource', (): void => {
    it('calls the validator with the correct arguments.', async(): Promise<void> => {
      const resourceID = { path: root };
      const representation = new BasicRepresentation();
      const parentRepresentation = new BasicRepresentation();
      source.getRepresentation = jest.fn().mockReturnValue(parentRepresentation);

      await expect(store.addResource(resourceID, representation)).resolves.toBe('add');
      expect(validator.handleSafe).toHaveBeenCalledTimes(1);
      expect(validator.handleSafe).toHaveBeenCalledWith({ parentRepresentation, representation });
      expect(source.getRepresentation).toHaveBeenCalledTimes(1);
      expect(source.getRepresentation).toHaveBeenLastCalledWith(resourceID, {});
      expect(source.addResource).toHaveBeenCalledTimes(1);
      expect(source.addResource).toHaveBeenLastCalledWith(resourceID, representation, undefined);
    });
  });

  describe('setting a Representation', (): void => {
    let parentRepresentation: Representation;
    let representation: Representation;
    const shapeURL = `${root}shape`;
    const containerURL = `${root}container/`;
    const metadataURL = containerURL + metaSuffix;
    const shapeConstraintQuad = quad(namedNode(containerURL), LDP.terms.constrainedBy, namedNode(shapeURL));
    const shapeConstraintQuad2 = quad(namedNode(containerURL), LDP.terms.constrainedBy, namedNode(`${shapeURL}1`));
    let metadataRepresentation: Representation =

    beforeEach((): void => {
      representation = new BasicRepresentation();

      parentRepresentation = new BasicRepresentation();
      source.getRepresentation = jest.fn().mockReturnValue(parentRepresentation);

      metadataRepresentation = new BasicRepresentation(
        guardedStreamFrom([ shapeConstraintQuad ]),
        { path: metadataURL },
        INTERNAL_QUADS,
      );
    });

    it('calls the source setRepresentation when the resource ID is the root.', async(): Promise<void> => {
      const resourceID = { path: root };

      await expect(store.setRepresentation(resourceID, representation)).resolves.toBe('set');
    });

    it('calls the validator with the correct arguments.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource.ttl` };

      await expect(store.setRepresentation(resourceID, representation)).resolves.toBe('set');
      expect(validator.handleSafe).toHaveBeenCalledTimes(1);
      expect(validator.handleSafe).toHaveBeenCalledWith({ parentRepresentation, representation });
      expect(source.getRepresentation).toHaveBeenCalledTimes(1);
      expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: root }, {});
      expect(source.setRepresentation).toHaveBeenCalledTimes(1);
      expect(source.setRepresentation).toHaveBeenLastCalledWith(resourceID, representation, undefined);
    });

    it('errors when the validation fails.', async(): Promise<void> => {
      const resourceID = { path: `${root}resource.ttl` };
      validator.handleSafe = jest.fn().mockRejectedValue(new BadRequestHttpError());

      await expect(store.setRepresentation(resourceID, representation)).rejects.toThrow(BadRequestHttpError);
      expect(validator.handleSafe).toHaveBeenCalledTimes(1);
      expect(validator.handleSafe).toHaveBeenCalledWith({ parentRepresentation, representation });
      expect(source.getRepresentation).toHaveBeenCalledTimes(1);
      expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: root }, {});
    });

    it('allows adding a shape constraint when none is currently present.', async(): Promise<void> => {
      const resourceID = { path: containerURL + metaSuffix };

      converter.handleSafe = jest.fn().mockReturnValueOnce(metadataRepresentation).mockReturnValueOnce(
        new BasicRepresentation(guardedStreamFrom([ ]), resourceID, INTERNAL_QUADS),
      );

      await expect(store.setRepresentation(resourceID, representation)).resolves.toBe('set');
      expect(validator.handleSafe).toHaveBeenCalledTimes(1);
      expect(validator.handleSafe).toHaveBeenCalledWith({ parentRepresentation, representation });
      expect(source.getRepresentation).toHaveBeenCalledTimes(2);
      expect(source.getRepresentation).toHaveBeenNthCalledWith(1, resourceID, {});
      expect(source.setRepresentation).toHaveBeenCalledTimes(1);
      expect(source.setRepresentation).toHaveBeenLastCalledWith(resourceID, representation, undefined);
    });

    it('errors when adding multiple shape constraints.', async(): Promise<void> => {
      const resourceID = { path: containerURL + metaSuffix };

      converter.handleSafe = jest.fn().mockReturnValueOnce(
        new BasicRepresentation(guardedStreamFrom([
          shapeConstraintQuad, shapeConstraintQuad2,
        ]), resourceID, INTERNAL_QUADS),
      ).mockReturnValueOnce(
        new BasicRepresentation(guardedStreamFrom([
        ]), resourceID, INTERNAL_QUADS),
      );

      await expect(store.setRepresentation(resourceID, representation)).rejects.toThrow(
        new BadRequestHttpError('A container can only be constrained by at most one shape resource.'),
      );
      expect(source.getRepresentation).toHaveBeenCalledTimes(1);
      expect(source.getRepresentation).toHaveBeenCalledWith(resourceID, {});
    });

    it('errors when adding a shape constraint when resources are already present in the container.',
      async(): Promise<void> => {
        const resourceID = { path: containerURL + metaSuffix };
        converter.handleSafe = jest.fn().mockReturnValueOnce(
          new BasicRepresentation(guardedStreamFrom([
            shapeConstraintQuad,
            quad(namedNode(containerURL), LDP.terms.contains, namedNode(`${containerURL}resource`)),
          ]), resourceID, INTERNAL_QUADS),
        ).mockReturnValueOnce(
          new BasicRepresentation(guardedStreamFrom([
          ]), resourceID, INTERNAL_QUADS),
        );
        await expect(store.setRepresentation(resourceID, representation)).rejects.toThrow(new BadRequestHttpError(
          'A container can only be constrained when there are no resources present in that container.',
        ));
      });

    it('allows adding the same shape constraint that was already present and some resources are present.',
      async(): Promise<void> => {
        const resourceID = { path: containerURL + metaSuffix };

        converter.handleSafe = jest.fn().mockReturnValueOnce(
          new BasicRepresentation(guardedStreamFrom([
            shapeConstraintQuad,
            quad(namedNode(containerURL), LDP.terms.contains, namedNode(`${containerURL}resource`)),
          ]), resourceID, INTERNAL_QUADS),
        ).mockReturnValueOnce(metadataRepresentation);

        await expect(store.setRepresentation(resourceID, representation)).resolves.toBe('set');
        expect(validator.handleSafe).toHaveBeenCalledTimes(1);
        expect(validator.handleSafe).toHaveBeenCalledWith({ parentRepresentation, representation });
        expect(source.getRepresentation).toHaveBeenCalledTimes(2);
        expect(source.getRepresentation).toHaveBeenNthCalledWith(1, resourceID, {});
        expect(source.setRepresentation).toHaveBeenCalledTimes(1);
        expect(source.setRepresentation).toHaveBeenLastCalledWith(resourceID, representation, undefined);
      });

    it('errors when changing the shape constraint when some resources are present.', async(): Promise<void> => {
      const resourceID = { path: containerURL + metaSuffix };

      converter.handleSafe = jest.fn().mockReturnValueOnce(
        new BasicRepresentation(guardedStreamFrom([
          shapeConstraintQuad2,
          quad(namedNode(containerURL), LDP.terms.contains, namedNode(`${containerURL}resource`)),
        ]), resourceID, INTERNAL_QUADS),
      ).mockReturnValueOnce(metadataRepresentation);
      await expect(store.setRepresentation(resourceID, representation)).rejects.toThrow(new BadRequestHttpError(
        'A container can only be constrained when there are no resources present in that container.',
      ));
    });
  });
});
