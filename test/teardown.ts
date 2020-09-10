import { promises as fs } from 'fs';

module.exports = async function(): Promise<void> {
  // Makes sure that even if tests fail, all test files get removed.
  await fs.rmdir('./uploads', { recursive: true });
};
