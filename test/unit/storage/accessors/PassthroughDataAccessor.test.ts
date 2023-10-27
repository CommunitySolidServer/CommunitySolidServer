import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { DataAccessor } from '../../../../src/storage/accessors/DataAccessor';
import { PassthroughDataAccessor } from '../../../../src/storage/accessors/PassthroughDataAccessor';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';

describe('ValidatingDataAccessor', (): void => {
  let passthrough: PassthroughDataAccessor;
  let childAccessor: jest.Mocked<DataAccessor>;

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
      writeMetadata: jest.fn(),
    };
    jest.spyOn(childAccessor, 'getChildren').mockImplementation();
    passthrough = new PassthroughDataAccessor(childAccessor);
  });

  describe('writeDocument()', (): void => {
    it('should call the accessors writeDocument() function.', async(): Promise<void> => {
      await passthrough.writeDocument(mockIdentifier, mockData, mockMetadata);
      expect(childAccessor.writeDocument).toHaveBeenCalledTimes(1);
      expect(childAccessor.writeDocument).toHaveBeenCalledWith(mockIdentifier, mockData, mockMetadata);
    });
  });
  describe('canHandle()', (): void => {
    it('should call the accessors canHandle() function.', async(): Promise<void> => {
      await passthrough.canHandle(mockRepresentation);
      expect(childAccessor.canHandle).toHaveBeenCalledTimes(1);
      expect(childAccessor.canHandle).toHaveBeenCalledWith(mockRepresentation);
    });
  });
  describe('getData()', (): void => {
    it('should call the accessors getData() function.', async(): Promise<void> => {
      await passthrough.getData(mockIdentifier);
      expect(childAccessor.getData).toHaveBeenCalledTimes(1);
      expect(childAccessor.getData).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('getMetadata()', (): void => {
    it('should call the accessors getMetadata() function.', async(): Promise<void> => {
      await passthrough.getMetadata(mockIdentifier);
      expect(childAccessor.getMetadata).toHaveBeenCalledTimes(1);
      expect(childAccessor.getMetadata).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('writeMetadata()', (): void => {
    it('should call the accessors writeMetadata() function.', async(): Promise<void> => {
      await passthrough.writeMetadata(mockIdentifier, mockMetadata);
      expect(childAccessor.writeMetadata).toHaveBeenCalledTimes(1);
      expect(childAccessor.writeMetadata).toHaveBeenCalledWith(mockIdentifier, mockMetadata);
    });
  });
  describe('getChildren()', (): void => {
    it('should call the accessors getChildren() function.', async(): Promise<void> => {
      passthrough.getChildren(mockIdentifier);
      expect(childAccessor.getChildren).toHaveBeenCalledTimes(1);
      expect(childAccessor.getChildren).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('deleteResource()', (): void => {
    it('should call the accessors deleteResource() function.', async(): Promise<void> => {
      await passthrough.deleteResource(mockIdentifier);
      expect(childAccessor.deleteResource).toHaveBeenCalledTimes(1);
      expect(childAccessor.deleteResource).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('writeContainer()', (): void => {
    it('should call the accessors writeContainer() function.', async(): Promise<void> => {
      await passthrough.writeContainer(mockIdentifier, mockMetadata);
      expect(childAccessor.writeContainer).toHaveBeenCalledTimes(1);
      expect(childAccessor.writeContainer).toHaveBeenCalledWith(mockIdentifier, mockMetadata);
    });
  });
});
