import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { FileIdentifierMapper, ResourceLink } from '../../../../src/storage/mapping/FileIdentifierMapper';
import { FileSizeReporter } from '../../../../src/storage/size-reporter/FileSizeReporter';

describe('A FileSizeReporter', (): void => {
  const mapper: jest.Mocked<FileIdentifierMapper> = {
    mapFilePathToUrl: jest.fn(),
    mapUrlToFilePath: jest.fn().mockImplementation((id: ResourceIdentifier): ResourceLink => ({
      filePath: id.path,
      identifier: id,
      isMetadata: false,
    })),
  };
  const fileRoot = join(process.cwd(), './test-folder/');
  const fileSizeReporter = new FileSizeReporter(
    mapper,
    fileRoot,
    [ '^/\\.internal$' ],
  );

  beforeAll(async(): Promise<void> => {
    await fsPromises.mkdir(fileRoot, { recursive: true });
  });
  afterAll(async(): Promise<void> => {
    await fsPromises.rmdir(fileRoot, { recursive: true });
  });

  it('should report the right file size.', async(): Promise<void> => {
    const testFile = join(fileRoot, './test.txt');
    await fsPromises.writeFile(testFile, 'Test file for file size!');

    const result = fileSizeReporter.getSize({ path: testFile });
    await expect(result).resolves.toBeDefined();
    expect((await result).amount).toBe((await fsPromises.stat(testFile)).size);

    await fsPromises.unlink(testFile);
  });

  it('should work recursively.', async(): Promise<void> => {
    const containerFile = join(fileRoot, './test-folder-1/');
    await fsPromises.mkdir(containerFile, { recursive: true });
    const testFile = join(containerFile, './test.txt');
    await fsPromises.writeFile(testFile, 'Test file for file size!');

    const fileSize = fileSizeReporter.getSize({ path: testFile });
    const containerSize = fileSizeReporter.getSize({ path: containerFile });

    const expectedFileSize = (await fsPromises.stat(testFile)).size;
    const expectedContainerSize = expectedFileSize + (await fsPromises.stat(containerFile)).size;

    await expect(fileSize).resolves.toEqual(expect.objectContaining({ amount: expectedFileSize }));
    await expect(containerSize).resolves.toEqual(expect.objectContaining({ amount: expectedContainerSize }));

    await fsPromises.unlink(testFile);
    await fsPromises.rmdir(containerFile);
  });

  it('should not count files located in an ignored folder.', async(): Promise<void> => {
    const containerFile = join(fileRoot, './test-folder-2/');
    await fsPromises.mkdir(containerFile, { recursive: true });
    const testFile = join(containerFile, './test.txt');
    await fsPromises.writeFile(testFile, 'Test file for file size!');

    const internalContainerFile = join(fileRoot, './.internal/');
    await fsPromises.mkdir(internalContainerFile, { recursive: true });
    const internalTestFile = join(internalContainerFile, './test.txt');
    await fsPromises.writeFile(internalTestFile, 'Test file for file size!');

    const fileSize = fileSizeReporter.getSize({ path: testFile });
    const containerSize = fileSizeReporter.getSize({ path: containerFile });
    const rootSize = fileSizeReporter.getSize({ path: fileRoot });

    const expectedFileSize = (await fsPromises.stat(testFile)).size;
    const expectedContainerSize = expectedFileSize + (await fsPromises.stat(containerFile)).size;
    const expectedRootSize = expectedContainerSize + (await fsPromises.stat(fileRoot)).size;

    await expect(fileSize).resolves.toEqual(expect.objectContaining({ amount: expectedFileSize }));
    await expect(containerSize).resolves.toEqual(expect.objectContaining({ amount: expectedContainerSize }));
    await expect(rootSize).resolves.toEqual(expect.objectContaining({ amount: expectedRootSize }));

    await fsPromises.unlink(testFile);
    await fsPromises.unlink(internalTestFile);
    await fsPromises.rmdir(internalContainerFile);
    await fsPromises.rmdir(containerFile);
  });

  it('should have the unit in its return value.', async(): Promise<void> => {
    const testFile = join(fileRoot, './test2.txt');
    await fsPromises.writeFile(testFile, 'Test file for file size!');

    const result = fileSizeReporter.getSize({ path: testFile });
    await expect(result).resolves.toBeDefined();
    expect((await result).unit).toBe('bytes');

    await fsPromises.unlink(testFile);
  });

  it('getUnit() should return \'bytes\'.', (): void => {
    expect(fileSizeReporter.getUnit()).toBe('bytes');
  });

  it('should return 0 when the size of a non existent file is requested.', async(): Promise<void> => {
    const result = fileSizeReporter.getSize({ path: join(fileRoot, './test.txt') });
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
      await expect(fileSizeReporter.estimateSize(metadata)).resolves.toEqual(100);
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
