import { promises as fsPromises } from 'fs';
import { join } from 'path';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { FileIdentifierMapper, ResourceLink } from '../../../../src/storage/mapping/FileIdentifierMapper';
import { FileSizeReporter } from '../../../../src/storage/size-reporter/FileSizeReporter';

describe('A FileSizeReporter', (): void => {
  const mapper: FileIdentifierMapper = {
    mapFilePathToUrl: jest.fn(),
    mapUrlToFilePath: jest.fn().mockImplementation((id: ResourceIdentifier): ResourceLink => ({
      filePath: id.path,
      identifier: id,
      isMetadata: false,
    })),
  };
  const fileSizeReporter = new FileSizeReporter(mapper);

  it('should report the right file size.', async(): Promise<void> => {
    const testFile = join(process.cwd(), './test.txt');
    await fsPromises.writeFile(testFile, 'Test file for file size!');

    const result = fileSizeReporter.getSize({ path: testFile });
    await expect(result).resolves.toBeDefined();
    expect((await result).amount).toBe((await fsPromises.lstat(testFile)).size);

    await fsPromises.unlink(testFile);
  });

  it('should work recursively.', async(): Promise<void> => {
    const containerFile = join(process.cwd(), './test-folder-1/');
    await fsPromises.mkdir(containerFile, { recursive: true });
    const testFile = join(containerFile, './test.txt');
    await fsPromises.writeFile(testFile, 'Test file for file size!');

    const fileSize = fileSizeReporter.getSize({ path: testFile });
    const containerSize = fileSizeReporter.getSize({ path: containerFile });

    const expectedFileSize = (await fsPromises.lstat(testFile)).size;
    const expectedContainerSize = expectedFileSize + (await fsPromises.lstat(containerFile)).size;

    await expect(fileSize).resolves.toEqual(expect.objectContaining({ amount: expectedFileSize }));
    await expect(containerSize).resolves.toEqual(expect.objectContaining({ amount: expectedContainerSize }));

    await fsPromises.unlink(testFile);
    await fsPromises.rmdir(containerFile);
  });

  it('should not count files located in a .internal folder.', async(): Promise<void> => {
    const containerFile = join(process.cwd(), './test-folder-2/');
    await fsPromises.mkdir(containerFile, { recursive: true });
    const testFile = join(containerFile, './test.txt');
    await fsPromises.writeFile(testFile, 'Test file for file size!');

    const internalContainerFile = join(process.cwd(), './test-folder-2/.internal/');
    await fsPromises.mkdir(internalContainerFile, { recursive: true });
    const internalTestFile = join(internalContainerFile, './test.txt');
    await fsPromises.writeFile(internalTestFile, 'Test file for file size!');

    const fileSize = fileSizeReporter.getSize({ path: testFile });
    const containerSize = fileSizeReporter.getSize({ path: containerFile });

    const expectedFileSize = (await fsPromises.lstat(testFile)).size;
    const expectedContainerSize = expectedFileSize + (await fsPromises.lstat(containerFile)).size;

    await expect(fileSize).resolves.toEqual(expect.objectContaining({ amount: expectedFileSize }));
    await expect(containerSize).resolves.toEqual(expect.objectContaining({ amount: expectedContainerSize }));

    await fsPromises.unlink(testFile);
    await fsPromises.unlink(internalTestFile);
    await fsPromises.rmdir(internalContainerFile);
    await fsPromises.rmdir(containerFile);
  });

  it('should have the unit in its return value.', async(): Promise<void> => {
    const testFile = join(process.cwd(), './test.txt');
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
    const result = fileSizeReporter.getSize({ path: join(process.cwd(), './test.txt') });
    await expect(result).resolves.toEqual(expect.objectContaining({ amount: 0 }));
  });

  it('should calculate the chunk size correctly.', async(): Promise<void> => {
    const testString = 'testesttesttesttest==testtest';
    const result = fileSizeReporter.calculateChunkSize(testString);
    await expect(result).resolves.toEqual(testString.length);
  });
});
