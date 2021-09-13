import { statSync, unlinkSync, writeFileSync, mkdirSync, rmdirSync } from 'fs';
import { FileSizeReporter } from '../../../../src/storage/size-reporter/FileSizeReporter';

describe('A FileSizeReporter', (): void => {
  const fileSizeReporter = new FileSizeReporter();

  it('should report the right file size.', (): void => {
    const testFile = './test.txt';
    writeFileSync(testFile, 'Test file for file size!');
    expect(fileSizeReporter.getSize({ path: testFile }).amount).toBe(statSync(testFile).size);
    unlinkSync(testFile);
  });

  it('should work recursively.', (): void => {
    const testFile = './test/data/test.txt';
    mkdirSync('./test/data/', { recursive: true });
    writeFileSync(testFile, 'Test file for file size!');
    const fileSize = fileSizeReporter.getSize({ path: testFile }).amount;
    const containerSize = fileSizeReporter.getSize({ path: './test/data' }).amount;
    expect(fileSize).toBe(statSync(testFile).size);
    expect(containerSize).toBeGreaterThan(fileSize);

    unlinkSync(testFile);
    rmdirSync('./test/data');
  });

  it('should have the unit in its return value.', (): void => {
    const testFile = './test.txt';
    writeFileSync(testFile, 'Test file for file size unit!');
    expect(fileSizeReporter.getSize({ path: testFile }).unit).toBe('bytes');
    unlinkSync(testFile);
  });

  it('should have the right unit property.', (): void => {
    expect(fileSizeReporter.unit).toBe('bytes');
  });
});
