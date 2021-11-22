import type { Validator, ValidatorInput } from '../../../../src/http/auxiliary/Validator';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { DataAccessor } from '../../../../src/storage/accessors/DataAccessor';
import { ValidatingDataAccessor } from '../../../../src/storage/accessors/ValidatingDataAccessor';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';

describe('ValidatingDataAccessor', (): void => {
  let validatingAccessor: ValidatingDataAccessor;
  let childAccessor: jest.Mocked<DataAccessor>;
  let validator: jest.Mocked<Validator>;

  const mockIdentifier = { path: 'http://localhost/test.txt' };
  const mockMetadata = new RepresentationMetadata();
  const mockData = guardedStreamFrom('test string');
  const mockRepresentation = new BasicRepresentation(mockData, mockMetadata);

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    childAccessor = {
      canHandle: jest.fn(),
      writeDocument: jest.fn(),
      getData: jest.fn(),
      getChildren: jest.fn(),
      writeContainer: jest.fn(),
      deleteResource: jest.fn(),
      getMetadata: jest.fn(),
    };
    childAccessor.getChildren = jest.fn();
    validator = {
      canHandle: jest.fn(),
      handle: jest.fn(async(input: ValidatorInput): Promise<Representation> => input.representation),
      handleSafe: jest.fn(),
    };
    validatingAccessor = new ValidatingDataAccessor(childAccessor, validator);
  });

  describe('writeDocument()', (): void => {
    it('should call the validator\'s handle() function.', async(): Promise<void> => {
      const spy = jest.spyOn(validator, 'handle');
      await validatingAccessor.writeDocument(mockIdentifier, mockData, mockMetadata);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ representation: mockRepresentation, identifier: mockIdentifier });
    });
    it('should call the accessors writeDocument() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'writeDocument');
      await validatingAccessor.writeDocument(mockIdentifier, mockData, mockMetadata);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier, mockData, mockMetadata);
    });
  });
});