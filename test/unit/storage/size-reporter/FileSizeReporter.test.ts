import { promises as fsPromises } from 'node:fs';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { FileIdentifierMapper, ResourceLink } from '../../../../src/storage/mapping/FileIdentifierMapper';
import { FileSizeReporter } from '../../../../src/storage/size-reporter/FileSizeReporter';
import { UNIT_BYTES } from '../../../../src/storage/size-reporter/Size';
import { joinFilePath } from '../../../../src/util/PathUtil';
import { mockFileSystem } from '../../../util/Util';

jest.mock('node:fs');

describe('A FileSizeReporter', (): void => {
  // Folder size is fixed to 4 in the mock
  const folderSize = 4;
  const mapper: jest.Mocked<FileIdentifierMapper> = {
    mapFilePathToUrl: jest.fn(),
    mapUrlToFilePath: jest.fn().mockImplementation((id: ResourceIdentifier): ResourceLink => ({
      filePath: id.path,
      identifier: id,
      isMetadata: false,
    })),
  };
  const fileRoot = joinFilePath(process.cwd(), '/test-folder/');
  const fileSizeReporter = new FileSizeReporter(
    mapper,
    fileRoot,
    [ '^/\\.internal$' ],
  );

  beforeEach(async(): Promise<void> => {
    mockFileSystem(fileRoot);
  });

  it('should work without the ignoreFolders constructor parameter.', async(): Promise<void> => {
    const tempFileSizeReporter = new FileSizeReporter(
      mapper,
      fileRoot,
    );

    const testFile = joinFilePath(fileRoot, '/test.txt');
    await fsPromises.writeFile(testFile, 'A'.repeat(20));

    const result = tempFileSizeReporter.getSize({ path: testFile });
    await expect(result).resolves.toBeDefined();
    expect((await result).amount).toBe(20);
  });

  it('should report the right file size.', async(): Promise<void> => {
    const testFile = joinFilePath(fileRoot, '/test.txt');
    await fsPromises.writeFile(testFile, 'A'.repeat(20));

    const result = fileSizeReporter.getSize({ path: testFile });
    await expect(result).resolves.toBeDefined();
    expect((await result).amount).toBe(20);
  });

  it('should work recursively.', async(): Promise<void> => {
    const containerFile = joinFilePath(fileRoot, '/test-folder-1/');
    await fsPromises.mkdir(containerFile, { recursive: true });
    const testFile = joinFilePath(containerFile, '/test.txt');
    await fsPromises.writeFile(testFile, 'A'.repeat(20));

    const fileSize = fileSizeReporter.getSize({ path: testFile });
    const containerSize = fileSizeReporter.getSize({ path: containerFile });

    await expect(fileSize).resolves.toEqual(expect.objectContaining({ amount: 20 }));
    await expect(containerSize).resolves.toEqual(expect.objectContaining({ amount: 20 + folderSize }));
  });

  it('should not count files located in an ignored folder.', async(): Promise<void> => {
    const containerFile = joinFilePath(fileRoot, '/test-folder-2/');
    await fsPromises.mkdir(containerFile, { recursive: true });
    const testFile = joinFilePath(containerFile, '/test.txt');
    await fsPromises.writeFile(testFile, 'A'.repeat(20));

    const internalContainerFile = joinFilePath(fileRoot, '/.internal/');
    await fsPromises.mkdir(internalContainerFile, { recursive: true });
    const internalTestFile = joinFilePath(internalContainerFile, '/test.txt');
    await fsPromises.writeFile(internalTestFile, 'A'.repeat(30));

    const fileSize = fileSizeReporter.getSize({ path: testFile });
    const containerSize = fileSizeReporter.getSize({ path: containerFile });
    const rootSize = fileSizeReporter.getSize({ path: fileRoot });

    const expectedFileSize = 20;
    const expectedContainerSize = 20 + folderSize;
    const expectedRootSize = expectedContainerSize + folderSize;

    await expect(fileSize).resolves.toEqual(expect.objectContaining({ amount: expectedFileSize }));
    await expect(containerSize).resolves.toEqual(expect.objectContaining({ amount: expectedContainerSize }));
    await expect(rootSize).resolves.toEqual(expect.objectContaining({ amount: expectedRootSize }));
  });

  it('should have the unit in its return value.', async(): Promise<void> => {
    const testFile = joinFilePath(fileRoot, '/test2.txt');
    await fsPromises.writeFile(testFile, 'A'.repeat(20));

    const result = fileSizeReporter.getSize({ path: testFile });
    await expect(result).resolves.toBeDefined();
    expect((await result).unit).toBe(UNIT_BYTES);
  });

  it('getUnit() should return UNIT_BYTES.', (): void => {
    expect(fileSizeReporter.getUnit()).toBe(UNIT_BYTES);
  });

  it('should return 0 when the size of a non existent file is requested.', async(): Promise<void> => {
    const result = fileSizeReporter.getSize({ path: joinFilePath(fileRoot, '/test.txt') });
    await expect(result).resolves.toEqual(expect.objectContaining({ amount: 0 }));
  });

  it('should calculate the chunk size correctly.', async(): Promise<void> => {
    const testString = 'testesttesttesttest==testtest';
    const result = fileSizeReporter.calculateChunkSize(testString);
    await expect(result).resolves.toEqual(testString.length);
  });

  describe('estimateSize()', (): void => {
    it('should return the content-length.', async(): Promise<void> => {
      const metadata = new RepresentationMetadata();
      metadata.contentLength = 100;
      await expect(fileSizeReporter.estimateSize(metadata)).resolves.toBe(100);
    });
    it(
      'should return undefined if no content-length is present in the metadata.',
      async(): Promise<void> => {
        const metadata = new RepresentationMetadata();
        await expect(fileSizeReporter.estimateSize(metadata)).resolves.toBeUndefined();
      },
    );
  });
});
