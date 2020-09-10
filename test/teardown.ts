import { promises as fs } from 'fs';

module.exports = async function(): Promise<void> {
  // Removes uploads riectory and makes sure that even if tests fail, all test files get removed.
  await fs.rmdir('./uploads', { recursive: true });
};
