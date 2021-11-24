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
    };
    childAccessor.getChildren = jest.fn();
    passthrough = new PassthroughDataAccessor(childAccessor);
  });

  describe('writeDocument()', (): void => {
    it('should call the accessors writeDocument() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'writeDocument');
      await passthrough.writeDocument(mockIdentifier, mockData, mockMetadata);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier, mockData, mockMetadata);
    });
  });
  describe('canHandle()', (): void => {
    it('should call the accessors canHandle() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'canHandle');
      await passthrough.canHandle(mockRepresentation);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockRepresentation);
    });
  });
  describe('getData()', (): void => {
    it('should call the accessors getData() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'getData');
      await passthrough.getData(mockIdentifier);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('getMetadata()', (): void => {
    it('should call the accessors getMetadata() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'getMetadata');
      await passthrough.getMetadata(mockIdentifier);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('getChildren()', (): void => {
    it('should call the accessors getChildren() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'getChildren');
      passthrough.getChildren(mockIdentifier);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('deleteResource()', (): void => {
    it('should call the accessors deleteResource() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'deleteResource');
      await passthrough.deleteResource(mockIdentifier);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier);
    });
  });
  describe('writeContainer()', (): void => {
    it('should call the accessors writeContainer() function.', async(): Promise<void> => {
      const spy = jest.spyOn(childAccessor, 'writeContainer');
      await passthrough.writeContainer(mockIdentifier, mockMetadata);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockIdentifier, mockMetadata);
    });
  });
});
