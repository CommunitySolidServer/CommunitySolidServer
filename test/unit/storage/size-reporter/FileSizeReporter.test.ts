import { statSync, unlinkSync, writeFileSync } from 'fs';
import { FileSizeReporter } from '../../../../src/storage/size-reporter/FileSizeReporter';

describe('A FileSizeReporter', (): void => {
  const fileSizeReporter = new FileSizeReporter();

  it('should report the right file size.', (): void => {
    const testFile = './test.txt';
    writeFileSync(testFile, 'Test file for file size!');
    expect(fileSizeReporter.getSize({ path: testFile })).toBe(statSync(testFile).size);
    unlinkSync(testFile);
  });

  it('should have the right unit property.', (): void => {
    expect(fileSizeReporter.unit).toBe('bytes');
  });
});
