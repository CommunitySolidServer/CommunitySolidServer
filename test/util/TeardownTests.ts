import { getTestFolder, removeFolder } from '../integration/Config';

// Jest global teardown requires a single function to be exported
export default async function(): Promise<void> {
  // Clean up the root test folder
  await removeFolder(getTestFolder(''));
}
