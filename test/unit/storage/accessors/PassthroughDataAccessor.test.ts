import type { Validator, ValidatorInput } from '../../../../src/http/auxiliary/Validator';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { AtomicDataAccessor } from '../../../../src/storage/accessors/AtomicDataAccessor';
import { InMemoryDataAccessor } from '../../../../src/storage/accessors/InMemoryDataAccessor';
import { ValidatingDataAccessor } from '../../../../src/storage/accessors/ValidatingDataAccessor';
import { SingleRootIdentifierStrategy } from '../../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';

jest.mock('../../../../src/storage/accessors/InMemoryDataAccessor');

describe('ValidatingDataAccessor', (): void => {
  let validatingAccessor: ValidatingDataAccessor;
  let childAccessor: AtomicDataAccessor;
  let validator: Validator;

  const mockIdentifier = { path: 'http://localhost/test.txt' };
  const mockMetadata = new RepresentationMetadata();
  const mockData = guardedStreamFrom('test string');
  const mockRepresentation = new BasicRepresentation(mockData, mockMetadata);

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    childAccessor = new InMemoryDataAccessor(new SingleRootIdentifierStrategy('http://localhost'));
    childAccessor.getChildren = jest.fn();
    validator = {
      canHandle: jest.fn(),
      handle: async(input: ValidatorInput): Promise<Representation> => input.representation,
      handleSafe: jest.fn(),
    };
    validatingAccessor = new ValidatingDataAccessor(childAccessor, validator);
  });

  describe('writeDocument()', (): void => {
    it('should call the accessors writeDocument() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'writeDocument');
      await validatingAccessor.writeDocument(mockIdentifier, mockData, mockMetadata);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier, mockData, mockMetadata);
    });
  });
  describe('canHandle()', (): void => {
    it('should call the accessors canHandle() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'canHandle');
      await validatingAccessor.canHandle(mockRepresentation);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockRepresentation);
    });
  });
  describe('getData()', (): void => {
    it('should call the accessors getData() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'getData');
      await validatingAccessor.getData(mockIdentifier);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('getMetadata()', (): void => {
    it('should call the accessors getMetadata() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'getMetadata');
      await validatingAccessor.getMetadata(mockIdentifier);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('getChildren()', (): void => {
    it('should call the accessors getChildren() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'getChildren');
      validatingAccessor.getChildren(mockIdentifier);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('deleteResource()', (): void => {
    it('should call the accessors deleteResource() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'deleteResource');
      await validatingAccessor.deleteResource(mockIdentifier);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('writeContainer()', (): void => {
    it('should call the accessors writeContainer() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'writeContainer');
      await validatingAccessor.writeContainer(mockIdentifier, mockMetadata);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier, mockMetadata);
    });
  });
});
