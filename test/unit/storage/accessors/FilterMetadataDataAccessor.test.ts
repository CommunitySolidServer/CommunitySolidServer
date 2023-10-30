import { APPLICATION_JSON, CONTENT_LENGTH, CONTENT_TYPE, FilterPattern, toNamedTerm } from '../../../../src';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { DataAccessor } from '../../../../src/storage/accessors/DataAccessor';
import { FilterMetadataDataAccessor } from '../../../../src/storage/accessors/FilterMetadataDataAccessor';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';

describe('FilterMetadataDataAccessor', (): void => {
  let childAccessor: jest.Mocked<DataAccessor>;

  const mockIdentifier = { path: 'http://localhost/test.txt' };
  const mockData = guardedStreamFrom('test string');

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    childAccessor = {
      getChildren: jest.fn(),
      writeDocument: jest.fn(),
      writeContainer: jest.fn(),
    } as any;
  });

  it('removes only the matching metadata properties when calling writeDocument.', async(): Promise<void> => {
    const filterMetadataAccessor = new FilterMetadataDataAccessor(
      childAccessor,
      [ new FilterPattern(undefined, CONTENT_LENGTH) ],
    );
    const mockMetadata = new RepresentationMetadata();
    mockMetadata.contentLength = 40;
    mockMetadata.contentType = APPLICATION_JSON;
    await filterMetadataAccessor.writeDocument(mockIdentifier, mockData, mockMetadata);
    expect(childAccessor.writeDocument).toHaveBeenCalledTimes(1);
    expect(childAccessor.writeDocument).toHaveBeenLastCalledWith(mockIdentifier, mockData, mockMetadata);
    expect(mockMetadata.contentLength).toBeUndefined();
    expect(mockMetadata.contentType).toBe(APPLICATION_JSON);
  });

  it('supports multiple filter patterns when calling writeDocument.', async(): Promise<void> => {
    const filters = [
      new FilterPattern(undefined, CONTENT_LENGTH),
      new FilterPattern(undefined, CONTENT_TYPE),
    ];
    const filterMetadataAccessor = new FilterMetadataDataAccessor(childAccessor, filters);
    const mockMetadata = new RepresentationMetadata();
    mockMetadata.contentLength = 40;
    mockMetadata.contentType = APPLICATION_JSON;
    await filterMetadataAccessor.writeDocument(mockIdentifier, mockData, mockMetadata);
    expect(childAccessor.writeDocument).toHaveBeenCalledTimes(1);
    expect(childAccessor.writeDocument).toHaveBeenLastCalledWith(mockIdentifier, mockData, mockMetadata);
    expect(mockMetadata.contentLength).toBeUndefined();
    expect(mockMetadata.contentType).toBeUndefined();
  });

  it('removes only the matching metadata properties when calling writeContainer.', async(): Promise<void> => {
    const filterMetadataAccessor = new FilterMetadataDataAccessor(
      childAccessor,
      [ new FilterPattern(undefined, CONTENT_LENGTH) ],
    );
    const mockMetadata = new RepresentationMetadata();
    mockMetadata.contentLength = 40;
    mockMetadata.contentType = APPLICATION_JSON;
    await filterMetadataAccessor.writeContainer(mockIdentifier, mockMetadata);
    expect(childAccessor.writeContainer).toHaveBeenCalledTimes(1);
    expect(childAccessor.writeContainer).toHaveBeenLastCalledWith(mockIdentifier, mockMetadata);
    expect(mockMetadata.contentLength).toBeUndefined();
    expect(mockMetadata.contentType).toBe(APPLICATION_JSON);
  });

  it('supports multiple filter patterns when calling writeContainer.', async(): Promise<void> => {
    const filters = [
      new FilterPattern(undefined, CONTENT_LENGTH),
      new FilterPattern(undefined, CONTENT_TYPE),
    ];
    const filterMetadataAccessor = new FilterMetadataDataAccessor(childAccessor, filters);
    const mockMetadata = new RepresentationMetadata();
    mockMetadata.contentLength = 40;
    mockMetadata.contentType = APPLICATION_JSON;
    await filterMetadataAccessor.writeContainer(mockIdentifier, mockMetadata);
    expect(childAccessor.writeContainer).toHaveBeenCalledTimes(1);
    expect(childAccessor.writeContainer).toHaveBeenLastCalledWith(mockIdentifier, mockMetadata);
    expect(mockMetadata.contentLength).toBeUndefined();
    expect(mockMetadata.contentType).toBeUndefined();
  });

  it('an empty filter matches all metadata entries, and thus everything is removed.', async(): Promise<void> => {
    const filters = [ new FilterPattern() ];
    const filterMetadataAccessor = new FilterMetadataDataAccessor(childAccessor, filters);
    const mockMetadata = new RepresentationMetadata();
    mockMetadata.contentLength = 40;
    mockMetadata.contentType = APPLICATION_JSON;
    await filterMetadataAccessor.writeContainer(mockIdentifier, mockMetadata);
    expect(childAccessor.writeContainer).toHaveBeenCalledTimes(1);
    expect(childAccessor.writeContainer).toHaveBeenLastCalledWith(mockIdentifier, mockMetadata);
    expect(mockMetadata.contentLength).toBeUndefined();
    expect(mockMetadata.contentType).toBeUndefined();
    expect(mockMetadata.quads()).toHaveLength(0);
  });

  it('supports filtering based on subject.', async(): Promise<void> => {
    const subject = 'http://example.org/resource/test1';
    const filters = [ new FilterPattern(subject) ];
    const filterMetadataAccessor = new FilterMetadataDataAccessor(childAccessor, filters);
    const mockMetadata = new RepresentationMetadata();
    mockMetadata.addQuad(subject, toNamedTerm('http://xmlns.com/foaf/0.1/name'), 'Alice');
    expect(mockMetadata.quads(subject)).toHaveLength(1);
    await filterMetadataAccessor.writeDocument(mockIdentifier, mockData, mockMetadata);
    expect(childAccessor.writeDocument).toHaveBeenCalledTimes(1);
    expect(childAccessor.writeDocument).toHaveBeenLastCalledWith(mockIdentifier, mockData, mockMetadata);
    expect(mockMetadata.quads(subject)).toHaveLength(0);
  });

  it('supports filtering based on object.', async(): Promise<void> => {
    const subject = 'http://example.org/resource/test1';
    const object = 'http://example.org/resource/test2';
    const filters = [ new FilterPattern(undefined, undefined, object) ];
    const filterMetadataAccessor = new FilterMetadataDataAccessor(childAccessor, filters);
    const mockMetadata = new RepresentationMetadata();
    mockMetadata.addQuad(subject, toNamedTerm('http://xmlns.com/foaf/0.1/knows'), toNamedTerm(object));
    expect(mockMetadata.quads(subject)).toHaveLength(1);
    await filterMetadataAccessor.writeContainer(mockIdentifier, mockMetadata);
    expect(childAccessor.writeContainer).toHaveBeenCalledTimes(1);
    expect(childAccessor.writeContainer).toHaveBeenLastCalledWith(mockIdentifier, mockMetadata);
    expect(mockMetadata.quads(subject)).toHaveLength(0);
  });
});
