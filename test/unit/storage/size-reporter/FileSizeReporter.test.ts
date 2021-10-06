import { statSync, unlinkSync, writeFileSync, mkdirSync, rmdirSync } from 'fs';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
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
    const testFile = './test.txt';
    writeFileSync(testFile, 'Test file for file size!');

    const result = fileSizeReporter.getSize({ path: testFile });
    await expect(result).resolves.toBeDefined();
    expect((await result).amount).toBe(statSync(testFile).size);

    unlinkSync(testFile);
  });

  it('should work recursively.', async(): Promise<void> => {
    const containerFile = './test/data/';
    mkdirSync(containerFile, { recursive: true });
    const testFile = './test/data/test.txt';
    writeFileSync(testFile, 'Test file for file size!');

    const fileSize = fileSizeReporter.getSize({ path: testFile });
    const containerSize = fileSizeReporter.getSize({ path: containerFile });

    await expect(fileSize).resolves.toEqual(expect.objectContaining({ amount: 24 }));
    await expect(containerSize).resolves.toEqual(expect.objectContaining({ amount: 120 }));

    unlinkSync(testFile);
    rmdirSync(containerFile);
  });

  it('should have the unit in its return value.', async(): Promise<void> => {
    const testFile = './test.txt';
    writeFileSync(testFile, 'Test file for file size!');

    const result = fileSizeReporter.getSize({ path: testFile });
    await expect(result).resolves.toBeDefined();
    expect((await result).unit).toBe('bytes');

    unlinkSync(testFile);
  });

  it('should have the right unit property.', (): void => {
    expect(fileSizeReporter.unit).toBe('bytes');
  });
});
