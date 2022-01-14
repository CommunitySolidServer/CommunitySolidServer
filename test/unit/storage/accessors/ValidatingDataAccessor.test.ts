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
      writeDocument: jest.fn(),
      writeContainer: jest.fn(),
    } as any;
    childAccessor.getChildren = jest.fn();
    validator = {
      handle: jest.fn(async(input: ValidatorInput): Promise<Representation> => input.representation),
    } as any;
    validatingAccessor = new ValidatingDataAccessor(childAccessor, validator);
  });

  describe('writeDocument()', (): void => {
    it('should call the validator\'s handle() function.', async(): Promise<void> => {
      await validatingAccessor.writeDocument(mockIdentifier, mockData, mockMetadata);
      expect(validator.handle).toHaveBeenCalledTimes(1);
      expect(validator.handle).toHaveBeenCalledWith({ representation: mockRepresentation, identifier: mockIdentifier });
    });
    it('should call the accessors writeDocument() function.', async(): Promise<void> => {
      await validatingAccessor.writeDocument(mockIdentifier, mockData, mockMetadata);
      expect(childAccessor.writeDocument).toHaveBeenCalledTimes(1);
      expect(childAccessor.writeDocument).toHaveBeenCalledWith(mockIdentifier, mockData, mockMetadata);
    });
  });
  describe('writeContainer()', (): void => {
    it('should call the accessors writeContainer() function.', async(): Promise<void> => {
      await validatingAccessor.writeContainer(mockIdentifier, mockMetadata);
      expect(childAccessor.writeContainer).toHaveBeenCalledTimes(1);
      expect(childAccessor.writeContainer).toHaveBeenCalledWith(mockIdentifier, mockMetadata);
    });
  });
});
